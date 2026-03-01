from datetime import datetime
from zoneinfo import ZoneInfo

from src.infrastructure.config.settings import settings


def app_now() -> datetime:
    return datetime.now(ZoneInfo(settings.app_timezone))

