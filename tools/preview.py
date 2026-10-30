"""Helyi, csak az ERP publikus fájljait kiszolgáló előnézet.
Futtatás: python tools/preview.py --port 5194
Cím: http://127.0.0.1:5194/erp/
"""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit, unquote
import argparse
from functools import partial
ROOT = Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlsplit(self.path)
        path = unquote(parsed.path)
        if path == "/":
            self.send_response(302)
            self.send_header("Location", "/erp/")
            self.end_headers()
            return
        if not path.startswith("/erp/") or ".." in Path(path).parts:
            self.send_error(404)
            return
        relative = path[len("/erp/"):]
        if relative not in ("", "index.html", "manifest.webmanifest", "version.json", "sw.js") and not relative.startswith("assets/"):
            self.send_error(404)
            return
        self.path = "/" + relative + ("?" + parsed.query if parsed.query else "")
        super().do_GET()
parser = argparse.ArgumentParser()
parser.add_argument("--port", type=int, default=5194)
args = parser.parse_args()
print(f"ERP: http://127.0.0.1:{args.port}/erp/", flush=True)
ThreadingHTTPServer(("127.0.0.1", args.port), partial(Handler, directory=str(ROOT))).serve_forever()
