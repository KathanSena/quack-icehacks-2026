"""Quack web server: serves the static app and the /api endpoints.

Run:  python server.py        (then open http://localhost:8000)
Uses only the Python standard library.
"""

from __future__ import annotations

import json
import os
import time
from collections import defaultdict, deque
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

import duck_brain

ROOT = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(ROOT, "public")
MAX_BODY = 256 * 1024
RATE_LIMIT = (150, 600)  # 150 requests per 10 minutes per IP (chat + voice)

_hits: dict[str, deque] = defaultdict(deque)


def rate_limited(ip: str) -> bool:
    limit, window = RATE_LIMIT
    now = time.time()
    q = _hits[ip]
    while q and now - q[0] > window:
        q.popleft()
    if len(q) >= limit:
        return True
    q.append(now)
    return False


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "application/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".html": "text/html",
        ".json": "application/json",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        if self.path.startswith("/api/"):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):  # quieter logs
        if self.path.startswith("/api/"):
            super().log_message(fmt, *args)

    # ------------------------------------------------------------------ #
    def _json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _client_ip(self) -> str:
        fwd = self.headers.get("X-Forwarded-For", "")
        return fwd.split(",")[0].strip() if fwd else self.client_address[0]

    def do_GET(self):
        if self.path.split("?")[0] == "/api/health":
            return self._json(200, {"ok": True, "mode": duck_brain.mode(), "model": duck_brain.model_name()})
        return super().do_GET()

    def do_POST(self):
        route = self.path.split("?")[0]
        handlers = {"/api/duck": duck_brain.duck_turn, "/api/debrief": duck_brain.debrief, "/api/tts": duck_brain.tts}
        if route not in handlers:
            return self._json(404, {"error": "Not found"})
        if rate_limited(self._client_ip()):
            return self._json(429, {"error": "The duck needs a breather. Try again in a few minutes."})

        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            return self._json(400, {"error": "Invalid Content-Length."})
        if length <= 0:
            return self._json(400, {"error": "Request body is required."})
        if length > MAX_BODY:
            return self._json(413, {"error": "Request too large (try a smaller file)."})
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(payload, dict):
                raise ValueError("Expected a JSON object")
        except (ValueError, UnicodeDecodeError):
            return self._json(400, {"error": "Invalid JSON."})

        try:
            return self._json(200, handlers[route](payload))
        except ValueError as exc:
            return self._json(400, {"error": str(exc)})
        except duck_brain.LLMError as exc:
            self.log_error("LLM error: %s", exc)
            return self._json(502, {"error": "The duck lost its train of thought (AI service error). Try again."})
        except Exception as exc:  # noqa: BLE001
            self.log_error("Unhandled error: %r", exc)
            return self._json(500, {"error": "Something went wrong on our side."})


def main() -> None:
    os.chdir(ROOT)
    duck_brain.load_env(os.path.join(ROOT, ".env"))
    port = int(os.environ.get("PORT", "8000"))
    host = os.environ.get("HOST", "0.0.0.0")
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"Quack is listening on http://localhost:{port}  (mode: {duck_brain.mode()}, model: {duck_brain.model_name()})")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nBye! Quack.")


if __name__ == "__main__":
    main()
