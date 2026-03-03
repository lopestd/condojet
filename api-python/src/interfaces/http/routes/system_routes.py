from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from src.application.services.system_bootstrap_service import sync_global_defaults
from src.application.services.exceptions import AppError
from src.infrastructure.config.settings import settings
from src.infrastructure.database.session import get_db

router = APIRouter(tags=["system"])


@router.post("/internal/global-api-key/sync")
def sync_global_api_key(
    db: Session = Depends(get_db),
    x_global_api_key: str | None = Header(default=None, alias="X-Global-Api-Key"),
) -> dict:
    if not x_global_api_key:
        raise AppError("missing_global_api_key", status_code=401, code="missing_global_api_key")

    # Authorization for internal sync is the environment key from runtime.
    if x_global_api_key != settings.global_api_key:
        raise AppError("invalid_global_api_key", status_code=403, code="invalid_global_api_key")

    result = sync_global_defaults(db)
    return {
        "status": "ok",
        "created": result["api_key"]["created"],
        "id": result["api_key"]["id"],
        "nome": result["api_key"]["nome"],
    }


@router.post("/internal/global-admin/sync")
def sync_global_admin(
    db: Session = Depends(get_db),
    x_global_api_key: str | None = Header(default=None, alias="X-Global-Api-Key"),
) -> dict:
    if not x_global_api_key:
        raise AppError("missing_global_api_key", status_code=401, code="missing_global_api_key")
    if x_global_api_key != settings.global_api_key:
        raise AppError("invalid_global_api_key", status_code=403, code="invalid_global_api_key")

    result = sync_global_defaults(db)
    return {
        "status": "ok",
        "created": result["global_admin"]["created"],
        "id": result["global_admin"]["id"],
        "email": result["global_admin"]["email"],
        "perfil": result["global_admin"]["perfil"],
    }
