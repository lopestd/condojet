from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from src.application.services.exceptions import AppError
from src.infrastructure.config.settings import settings
from src.infrastructure.database.session import get_db
from src.infrastructure.repositories.chave_sistema_repository import ChaveSistemaRepository
from src.infrastructure.repositories.email_registry_repository import EmailRegistryRepository
from src.infrastructure.repositories.usuario_global_repository import UsuarioGlobalRepository
from src.infrastructure.security.password import hash_password

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

    repository = ChaveSistemaRepository(db)
    model, created = repository.upsert_global_api_key(x_global_api_key)
    return {"status": "ok", "created": created, "id": model.id, "nome": model.nome}


@router.post("/internal/global-admin/sync")
def sync_global_admin(
    db: Session = Depends(get_db),
    x_global_api_key: str | None = Header(default=None, alias="X-Global-Api-Key"),
) -> dict:
    if not x_global_api_key:
        raise AppError("missing_global_api_key", status_code=401, code="missing_global_api_key")
    if x_global_api_key != settings.global_api_key:
        raise AppError("invalid_global_api_key", status_code=403, code="invalid_global_api_key")

    email_registry_repository = EmailRegistryRepository(db)
    owner = email_registry_repository.find_owner(settings.global_admin_email)
    if owner is not None and owner[0] != "usuarios_globais":
        raise AppError("email_already_exists", status_code=409, code="email_already_exists")

    repository = UsuarioGlobalRepository(db)
    model, created = repository.upsert_admin_global(
        nome=settings.global_admin_name,
        email=settings.global_admin_email,
        senha_hash=hash_password(settings.global_admin_password),
    )
    return {"status": "ok", "created": created, "id": model.id, "email": model.email, "perfil": model.perfil}
