"""
Alphabet Safari - Windows desktop host.

Serves the web app from a local HTTP server and shows it in an Edge WebView2 window
(pywebview). It also exposes api/tts, which speaks any phrase with the same Microsoft
neural voices used for the recorded clips, caching each phrase on disk.
"""
import asyncio
import hashlib
import http.server
import json
import os
import sys
import threading
import urllib.parse

import webview

try:
    import edge_tts  # imported at module level so PyInstaller bundles it
except ImportError:  # the app still works; dynamic phrases fall back to Windows voices
    edge_tts = None

# Application directory (script mode or PyInstaller one-file mode)
if getattr(sys, "frozen", False):
    APP_ROOT = sys._MEIPASS
else:
    APP_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Per-user data lives outside the (temporary, read-only) bundle so it survives restarts.
DATA_DIR = os.path.join(os.environ.get("LOCALAPPDATA") or os.path.expanduser("~"), "AlphabetSafari")
TTS_CACHE_DIR = os.path.join(DATA_DIR, "tts_cache")
WEBVIEW_STORAGE_DIR = os.path.join(DATA_DIR, "webview")

# localStorage is scoped to the page origin (including the port), so a fixed port is what
# keeps a child's stars and stickers between launches. Fall back to any free port if taken.
PREFERRED_PORT = 48127

MAX_TTS_CHARS = 400
DEFAULT_VOICES = {
    "en": {"boy": "en-US-AnaNeural", "girl": "en-US-JennyNeural"},
    "ar": {"boy": "ar-SA-HamedNeural", "girl": "ar-SA-ZariyahNeural"},
}


def load_voices():
    """Read the voice table from content.js so recorded and live speech always match."""
    try:
        with open(os.path.join(APP_ROOT, "content.js"), encoding="utf-8") as f:
            text = f.read()
        marker = "\nwindow.ALPHABET_CONTENT = "
        start = text.index(marker) + len(marker)
        return json.loads(text[start:].strip().rstrip(";"))["voices"]
    except (OSError, ValueError, KeyError):
        return DEFAULT_VOICES


VOICES = load_voices()


def synthesize(text, voice):
    async def fetch():
        buf = bytearray()
        async for chunk in edge_tts.Communicate(text, voice).stream():
            if chunk["type"] == "audio":
                buf.extend(chunk["data"])
        return bytes(buf)

    return asyncio.run(fetch())


class AppRequestHandler(http.server.SimpleHTTPRequestHandler):
    # The Windows registry can map .js to text/plain, which browsers refuse to execute.
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "application/javascript",
        ".json": "application/json",
        ".mp3": "audio/mpeg",
        ".css": "text/css",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=APP_ROOT, **kwargs)

    def log_message(self, format, *args):
        pass  # keep the console quiet

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if path == "/api/health":
            return self.send_json({"tts": edge_tts is not None})
        if path == "/api/tts":
            return self.handle_tts()
        return super().do_GET()

    def send_json(self, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def handle_tts(self):
        if edge_tts is None:
            return self.send_error(503, "edge-tts is not installed")

        query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        text = query.get("text", [""])[0].strip()
        lang = "ar" if query.get("lang", ["en"])[0].lower().startswith("ar") else "en"
        gender = "girl" if query.get("gender", ["boy"])[0] == "girl" else "boy"
        if not text or len(text) > MAX_TTS_CHARS:
            return self.send_error(400, "text must be 1-%d characters" % MAX_TTS_CHARS)

        voice = VOICES[lang][gender]
        cache_key = hashlib.sha256(f"{voice}\n{text}".encode("utf-8")).hexdigest()
        cache_file = os.path.join(TTS_CACHE_DIR, f"{cache_key}.mp3")

        audio = None
        if os.path.exists(cache_file):
            try:
                with open(cache_file, "rb") as f:
                    audio = f.read()
            except OSError:
                audio = None

        if not audio:
            try:
                audio = synthesize(text, voice)
            except Exception as e:  # offline, service unavailable, ...
                return self.send_error(502, f"TTS unavailable: {e}")
            if not audio:
                return self.send_error(502, "TTS returned no audio")
            try:
                tmp = cache_file + f".{threading.get_ident()}.part"
                with open(tmp, "wb") as f:
                    f.write(audio)
                os.replace(tmp, cache_file)
            except OSError:
                pass

        self.send_response(200)
        self.send_header("Content-Type", "audio/mpeg")
        self.send_header("Content-Length", str(len(audio)))
        self.send_header("Cache-Control", "public, max-age=86400")
        self.end_headers()
        self.wfile.write(audio)


class AppServer(http.server.ThreadingHTTPServer):
    # Threads let page assets load while a TTS request is waiting on the network.
    daemon_threads = True


def create_server():
    for port in (PREFERRED_PORT, 0):
        try:
            return AppServer(("127.0.0.1", port), AppRequestHandler)
        except OSError:
            continue
    raise RuntimeError("Could not open a local port for Alphabet Safari")


class DesktopBridge:
    def __init__(self):
        self.window = None

    def toggle_fullscreen(self):
        if self.window:
            self.window.toggle_fullscreen()
            return True
        return False

    def get_platform(self):
        return "windows-desktop"


def main():
    os.makedirs(TTS_CACHE_DIR, exist_ok=True)
    os.makedirs(WEBVIEW_STORAGE_DIR, exist_ok=True)

    server = create_server()
    port = server.server_address[1]
    threading.Thread(target=server.serve_forever, daemon=True).start()

    bridge = DesktopBridge()
    bridge.window = webview.create_window(
        title="Alphabet Safari 🦁🎈 | Learn English & Arabic for Kids",
        url=f"http://127.0.0.1:{port}/index.html",
        width=1280,
        height=820,
        min_size=(920, 600),
        js_api=bridge,
        text_select=False,
        confirm_close=False,
    )

    # private_mode defaults to True in pywebview, which would wipe progress on every launch.
    webview.start(debug=False, private_mode=False, storage_path=WEBVIEW_STORAGE_DIR)
    server.shutdown()


if __name__ == "__main__":
    main()
