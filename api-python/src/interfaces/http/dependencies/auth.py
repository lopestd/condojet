from dataclasses import dataclass

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import text
from sqlalchemy.orm import Session

from src.application.services.exceptions import AppError
from src.infrastructure.database.session import get_db
from src.infrastructure.repositories.configuracao_repository import ConfiguracaoRepository
from src.infrastructure.security.jwt import decode_access_token
from src.infrastructure.timezone import DEFAULT_TIMEZONE, set_request_timezone
from src.interfaces.http.dependencies.tenant import TenantContext, get_tenant_context

security = HTTPBearer(auto_error=False)


@dataclass
class Principal:
    user_id: int
    role: str
    condominio_id: int | None
    tenant_context: TenantContext


def get_current_principal(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    tenant_context: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db),
) -> Principal:
    if credentials is None:
        raise AppError("missing_token", status_code=401, code="missing_token")

    payload = decode_access_token(credentials.credentials)
    sub = payload.get("sub")
    role = payload.get("role")
    condominio_id = payload.get("condominio_id")
    if sub is None or role is None:
        raise AppError("invalid_token_payload", status_code=401, code="invalid_token_payload")

    token_condominio_id: int | None = int(condominio_id) if condominio_id is not None else None
    token_role = str(role)

    if not tenant_context.is_global:
        if token_condominio_id is None or token_condominio_id != tenant_context.condominio_id:
            raise AppError("tenant_mismatch", status_code=403, code="tenant_mismatch")
    elif token_role != "ADMIN_GLOBAL" and token_condominio_id is None:
        raise AppError("invalid_token_payload", status_code=401, code="invalid_token_payload")

    effective_timezone = DEFAULT_TIMEZONE
    if token_condominio_id is not None:
        configuracao_repository = ConfiguracaoRepository(db)
        configuracao = configuracao_repository.find_by_condominio_id(token_condominio_id)
        if configuracao is not None and configuracao.timezone:
            effective_timezone = configuracao.timezone
    set_request_timezone(effective_timezone)
    db.execute(text("SELECT set_config('TIMEZONE', :tz, false)"), {"tz": effective_timezone})

    return Principal(
        user_id=int(sub),
        role=token_role,
        condominio_id=token_condominio_id,
        tenant_context=tenant_context,
    )


def require_roles(*allowed: str):
    def _require(principal: Principal = Depends(get_current_principal)) -> Principal:
        if principal.role not in allowed:
            raise AppError("forbidden", status_code=403, code="forbidden")
        return principal

    return _require
