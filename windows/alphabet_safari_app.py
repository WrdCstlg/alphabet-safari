import os
import sys
import threading
import http.server
import socketserver
import webview

# Find application directory (supports both script mode and PyInstaller frozen mode)
if getattr(sys, 'frozen', False):
    APP_ROOT = sys._MEIPASS
else:
    APP_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ICON_PATH = os.path.join(APP_ROOT, "assets", "mascot.ico")
if not os.path.exists(ICON_PATH):
    ICON_PATH = os.path.join(APP_ROOT, "windows", "mascot.ico")

class LocalAssetsHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=APP_ROOT, **kwargs)

    def log_message(self, format, *args):
        # Suppress verbose terminal HTTP logs in production
        pass

class DesktopBridge:
    def __init__(self, window_ref):
        self.window = window_ref

    def toggle_fullscreen(self):
        if self.window:
            self.window.toggle_fullscreen()
            return True
        return False

    def get_platform(self):
        return "windows-desktop"

def start_local_server(port):
    with socketserver.TCPServer(("127.0.0.1", port), LocalAssetsHandler) as httpd:
        httpd.serve_forever()

def main():
    import socket
    # Find free local port
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()

    # Start local HTTP server thread
    server_thread = threading.Thread(target=start_local_server, args=(port,), daemon=True)
    server_thread.start()

    app_url = f"http://127.0.0.1:{port}/index.html"

    # Create PyWebView Native Window
    bridge = DesktopBridge(None)
    window = webview.create_window(
        title="Alphabet Safari 🦁🎈 | Learn English & Arabic for Kids",
        url=app_url,
        width=1280,
        height=820,
        min_size=(920, 600),
        js_api=bridge,
        text_select=False,
        confirm_close=False
    )
    bridge.window = window

    # Run native window with Edge WebView2 GUI
    webview.start(debug=False, http_server=False)

if __name__ == "__main__":
    main()
