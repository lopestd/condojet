import json
import logging
from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI, Request, Response
from src.infrastructure.timezone import app_now

REQUEST_ID_HEADER = "X-Request-Id"
LOGGER_NAME = "condojet.api.http"


def _configure_logger() -> logging.Logger:
    logger = logging.getLogger(LOGGER_NAME)
    if not logging.getLogger().handlers:
        logging.basicConfig(level=logging.INFO, format="%(message)s")
    logger.setLevel(logging.INFO)
    return logger


def _emit_http_log(logger: logging.Logger, payload: dict) -> None:
    logger.info(json.dumps(payload, ensure_ascii=True, default=str))


def _request_id_from(request: Request) -> str:
    header_value = request.headers.get(REQUEST_ID_HEADER, "").strip()
    return header_value or str(uuid4())


def configure_request_observability(app: FastAPI) -> None:
    logger = _configure_logger()

    @app.middleware("http")
    async def request_observability(request: Request, call_next) -> Response:
        started_at = perf_counter()
        request_id = _request_id_from(request)
        request.state.request_id = request_id

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((perf_counter() - started_at) * 1000, 2)
            _emit_http_log(
                logger,
                {
                    "timestamp": app_now().isoformat(),
                    "event": "http_request",
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": 500,
                    "duration_ms": duration_ms,
                },
            )
            raise

        duration_ms = round((perf_counter() - started_at) * 1000, 2)
        response.headers[REQUEST_ID_HEADER] = request_id
        _emit_http_log(
            logger,
            {
                "timestamp": app_now().isoformat(),
                "event": "http_request",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            },
        )
        return response
