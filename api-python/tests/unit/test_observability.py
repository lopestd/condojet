import json

from starlette.requests import Request

from src.interfaces.http.middlewares.request_observability import (
    _configure_logger,
    _emit_http_log,
    _request_id_from,
)


def _build_request(headers: list[tuple[bytes, bytes]] | None = None) -> Request:
    scope = {
        "type": "http",
        "http_version": "1.1",
        "method": "GET",
        "scheme": "http",
        "path": "/api/v1/health",
        "raw_path": b"/api/v1/health",
        "query_string": b"",
        "headers": headers or [],
        "client": ("127.0.0.1", 12345),
        "server": ("127.0.0.1", 8000),
    }
    return Request(scope)


def test_request_id_generated_when_header_missing() -> None:
    request = _build_request()
    request_id = _request_id_from(request)
    assert isinstance(request_id, str)
    assert len(request_id) >= 8


def test_request_id_reuses_header_value() -> None:
    request = _build_request(headers=[(b"x-request-id", b"req-123")])
    request_id = _request_id_from(request)
    assert request_id == "req-123"


def test_emit_http_log_outputs_json(caplog) -> None:
    logger = _configure_logger()
    caplog.set_level("INFO", logger=logger.name)

    payload = {
        "event": "http_request",
        "request_id": "req-log-1",
        "method": "GET",
        "path": "/api/v1/health",
        "status_code": 200,
        "duration_ms": 1.23,
    }
    _emit_http_log(logger, payload)

    records = [record for record in caplog.records if record.name == logger.name]
    assert records
    parsed = json.loads(records[-1].message)
    assert parsed["event"] == "http_request"
    assert parsed["request_id"] == "req-log-1"
    assert parsed["status_code"] == 200
