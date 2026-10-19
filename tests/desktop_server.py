"""
Tests the Windows desktop app's local web server (windows/alphabet_safari_app.py) without
opening its window: it serves the app, reports speech, and refuses what it must refuse.

    py tests/desktop_server.py

The speech endpoint itself isn't called: that would send text to Microsoft's online voices.
"""
import http.client
import importlib.util
import json
import os
import sys
import threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_app():
    spec = importlib.util.spec_from_file_location("desktop_app", os.path.join(ROOT, "windows", "alphabet_safari_app.py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main():
    app = load_app()
    server = app.create_server()
    port = server.server_address[1]
    threading.Thread(target=server.serve_forever, daemon=True).start()

    def get(path, **headers):
        conn = http.client.HTTPConnection("127.0.0.1", port, timeout=10)
        conn.request("GET", path, headers={"Host": f"127.0.0.1:{port}", **headers})
        response = conn.getresponse()
        return response.status, response.getheader("Content-Type") or "", response.read()

    results = []

    def check(name, ok, detail=""):
        results.append(ok)
        print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f"  [{detail}]" if detail else ""))
        if not ok and os.environ.get("GITHUB_ACTIONS"):
            print(f"::error title=Desktop server check failed::{name} [{detail}]")

    check("listens on this computer only", server.server_address[0] == "127.0.0.1", server.server_address[0])
    status, ctype, body = get("/index.html")
    check("serves the app page", status == 200 and b"Alphabet Safari" in body, f"{status} {ctype}")
    status, ctype, body = get("/privacy.html")
    check("serves the privacy policy", status == 200, str(status))
    status, ctype, body = get("/script.js")
    check("serves app code as JavaScript", status == 200 and "javascript" in ctype, ctype)
    status, ctype, body = get("/api/health")
    tts = json.loads(body).get("tts") if status == 200 else None
    check("health endpoint answers", status == 200 and isinstance(tts, bool), body.decode(errors="replace")[:60])
    status, _, _ = get("/api/health", Host=f"evil.example:{port}")
    check("refuses a foreign Host header (DNS rebinding)", status == 403, str(status))
    status, _, _ = get("/api/tts?text=hi&lang=en&gender=boy", **{"Sec-Fetch-Site": "cross-site"})
    check("refuses speech requests from other websites", status == 403, str(status))
    if tts:
        status, _, _ = get("/api/tts?text=" + "a" * 500 + "&lang=en&gender=boy")
        check("refuses over-long speech text", status == 400, str(status))
    for path in ("/../../../../Windows/win.ini", "/%2e%2e/%2e%2e/%2e%2e/Windows/win.ini", "/..%5c..%5c..%5cWindows/win.ini"):
        status, _, body = get(path)
        check(f"no path traversal ({path[:16]}...)", status in (400, 404) and b"[fonts]" not in body, str(status))

    server.shutdown()
    failed = results.count(False)
    print(f"\n{len(results) - failed}/{len(results)} desktop server checks passed.")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
