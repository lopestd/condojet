from datetime import datetime
from contextvars import ContextVar
from zoneinfo import ZoneInfo

DEFAULT_TIMEZONE = "America/Sao_Paulo"
_request_timezone: ContextVar[str] = ContextVar("request_timezone", default=DEFAULT_TIMEZONE)


def app_now() -> datetime:
    return datetime.now(ZoneInfo(_request_timezone.get()))


def get_request_timezone() -> str:
    return _request_timezone.get()


def set_request_timezone(timezone: str) -> None:
    _request_timezone.set(timezone)
