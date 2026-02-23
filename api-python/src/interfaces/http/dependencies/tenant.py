from dataclasses import dataclass

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from src.application.services.exceptions import AppError
from src.infrastructure.config.settings import settings
from src.infrastructure.database.session import get_db
from src.infrastructure.repositories.chave_sistema_repository import ChaveSistemaRepository
from src.infrastructure.repositories.condominio_repository import CondominioRepository


@dataclass
class TenantContext:
    is_global: bool
    condominio_id: int | None
    api_key: str


def get_tenant_context(
    db: Session = Depends(get_db),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> TenantContext:
    if not x_api_key:
        raise AppError("missing_api_key", status_code=401, code="missing_api_key")

    chave_repository = ChaveSistemaRepository(db)
    chave_global_model = chave_repository.find_global_api_key()
    chave_global = chave_global_model.valor if chave_global_model is not None else settings.global_api_key

    if x_api_key == chave_global:
        return TenantContext(is_global=True, condominio_id=None, api_key=x_api_key)

    repository = CondominioRepository(db)
    condominio = repository.find_by_api_key(x_api_key)
    if condominio is None:
        raise AppError("invalid_api_key", status_code=401, code="invalid_api_key")

    return TenantContext(is_global=False, condominio_id=condominio.id, api_key=x_api_key)
