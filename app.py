"""Vercel-compatible WSGI entrypoint for Quack's JSON API."""

from __future__ import annotations

import json
from http import HTTPStatus
from typing import Callable

import duck_brain

MAX_BODY = 256 * 1024


def _response(start_response, status: int, payload: dict):
    body = json.dumps(payload).encode("utf-8")
    phrase = HTTPStatus(status).phrase
    start_response(
        f"{status} {phrase}",
        [
            ("Content-Type", "application/json; charset=utf-8"),
            ("Content-Length", str(len(body))),
            ("Cache-Control", "no-store"),
            ("X-Content-Type-Options", "nosniff"),
        ],
    )
    return [body]


def _payload(environ, start_response):
    try:
        length = int(environ.get("CONTENT_LENGTH") or 0)
    except ValueError:
        return None, _response(start_response, 400, {"error": "Invalid Content-Length."})
    if length <= 0:
        return None, _response(start_response, 400, {"error": "Request body is required."})
    if length > MAX_BODY:
        return None, _response(start_response, 413, {"error": "Request too large (try a smaller file)."})
    try:
        value = json.loads(environ["wsgi.input"].read(length).decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return None, _response(start_response, 400, {"error": "Invalid JSON."})
    if not isinstance(value, dict):
        return None, _response(start_response, 400, {"error": "Expected a JSON object."})
    return value, None


def app(environ, start_response):
    """Dispatch the API routes; Vercel serves files from public/ separately."""
    path = environ.get("PATH_INFO", "/")
    method = environ.get("REQUEST_METHOD", "GET").upper()

    if path == "/api/health" and method == "GET":
        return _response(
            start_response,
            200,
            {"ok": True, "mode": duck_brain.mode(), "model": duck_brain.model_name()},
        )

    actions: dict[str, Callable[[dict], dict]] = {
        "/api/duck": duck_brain.duck_turn,
        "/api/debrief": duck_brain.debrief,
    }
    if path in actions:
        if method != "POST":
            return _response(start_response, 405, {"error": "Method not allowed."})
        payload, error_response = _payload(environ, start_response)
        if error_response:
            return error_response
        try:
            return _response(start_response, 200, actions[path](payload))
        except ValueError as exc:
            return _response(start_response, 400, {"error": str(exc)})
        except duck_brain.LLMError:
            return _response(
                start_response,
                502,
                {"error": "The duck lost its train of thought (AI service error). Try again."},
            )
        except Exception:  # noqa: BLE001
            return _response(start_response, 500, {"error": "Something went wrong on our side."})

    return _response(start_response, 404, {"error": "Not found."})
