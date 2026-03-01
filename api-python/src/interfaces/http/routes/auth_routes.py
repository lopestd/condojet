from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.dtos.auth_dto import LoginRequestDTO, LoginResponseDTO, SessionProfileResponseDTO
from src.application.services.exceptions import AppError
from src.infrastructure.database.session import get_db
from src.infrastructure.repositories.auth_repository import AuthRepository
from src.infrastructure.repositories.configuracao_repository import ConfiguracaoRepository
from src.infrastructure.security.jwt import create_access_token
from src.infrastructure.security.password import verify_password
from src.infrastructure.timezone import DEFAULT_TIMEZONE, get_request_timezone
from src.interfaces.http.dependencies.auth import Principal, get_current_principal
from src.interfaces.http.dependencies.tenant import TenantContext, get_tenant_context

router = APIRouter(tags=["auth"])


@router.post("/auth/login", response_model=LoginResponseDTO)
def login(
    payload: LoginRequestDTO,
    tenant_context: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db),
) -> LoginResponseDTO:
    repository = AuthRepository(db)
    tenant_id = tenant_context.condominio_id
    include_global = False
    if tenant_context.is_global:
        tenant_id = payload.condominio_id
        if payload.acesso_condominio and payload.condominio_id is None:
            tenant_id = None
        include_global = not payload.acesso_condominio and payload.condominio_id is None

    account = repository.find_account_by_email(payload.email, condominio_id=tenant_id, include_global=include_global)
    if account is None:
        raise AppError("invalid_credentials", status_code=401, code="invalid_credentials")

    account_id, password_hash, role, condominio_id = account
    if not verify_password(payload.senha, password_hash):
        raise AppError("invalid_credentials", status_code=401, code="invalid_credentials")

    token = create_access_token(subject=str(account_id), role=role, condominio_id=condominio_id)
    return LoginResponseDTO(access_token=token, role=role, condominio_id=condominio_id)


@router.post("/auth/logout")
def logout() -> dict[str, str]:
    return {"message": "ok"}


@router.get("/auth/me", response_model=SessionProfileResponseDTO)
def me(
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> SessionProfileResponseDTO:
    repository = AuthRepository(db)
    nome_usuario, nome_condominio = repository.find_session_profile(
        user_id=principal.user_id,
        role=principal.role,
        condominio_id=principal.condominio_id,
    )
    timezone = get_request_timezone()
    if principal.condominio_id is not None:
        configuracao_repository = ConfiguracaoRepository(db)
        configuracao = configuracao_repository.find_by_condominio_id(principal.condominio_id)
        if configuracao is not None and configuracao.timezone:
            timezone = configuracao.timezone
        else:
            timezone = DEFAULT_TIMEZONE

    return SessionProfileResponseDTO(
        role=principal.role,
        condominio_id=principal.condominio_id,
        nome_usuario=nome_usuario,
        nome_condominio=nome_condominio,
        timezone=timezone,
    )
