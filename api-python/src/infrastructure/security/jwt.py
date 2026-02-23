from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt

from src.application.services.exceptions import AppError
from src.infrastructure.config.settings import settings

ALGORITHM = "HS256"


def create_access_token(subject: str, role: str, condominio_id: int | None = None) -> str:
    expires_delta = timedelta(minutes=settings.jwt_expires_minutes)
    expire = datetime.now(UTC) + expires_delta
    payload = {"sub": subject, "role": role, "exp": expire}
    if condominio_id is not None:
        payload["condominio_id"] = condominio_id
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise AppError("invalid_token", status_code=401, code="invalid_token") from exc
