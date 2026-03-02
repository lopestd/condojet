from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.dtos.configuracao_dto import UpdateConfiguracaoDTO
from src.application.services.exceptions import AppError
from src.infrastructure.database.session import get_db
from src.infrastructure.repositories.configuracao_repository import ConfiguracaoRepository
from src.infrastructure.timezone import DEFAULT_TIMEZONE, set_request_timezone
from src.interfaces.http.dependencies.auth import Principal, require_roles

router = APIRouter(tags=["configuracoes"])


@router.get("/configuracoes")
def get_configuracoes(
    principal: Principal = Depends(require_roles("ADMIN", "PORTEIRO")),
    db: Session = Depends(get_db),
) -> dict:
    if principal.condominio_id is None:
        raise AppError("forbidden", status_code=403, code="forbidden")
    repository = ConfiguracaoRepository(db)
    model = repository.get_or_create(principal.condominio_id)
    timezone = model.timezone or DEFAULT_TIMEZONE
    return {
        "timezone": timezone,
        "prazo_dias_encomenda_esquecida": model.prazo_dias_encomenda_esquecida or 15,
    }


@router.put("/configuracoes")
def update_configuracoes(
    payload: UpdateConfiguracaoDTO,
    principal: Principal = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> dict:
    if principal.condominio_id is None:
        raise AppError("forbidden", status_code=403, code="forbidden")
    repository = ConfiguracaoRepository(db)
    model = repository.upsert_operacionais(
        principal.condominio_id,
        timezone=payload.timezone,
        prazo_dias_encomenda_esquecida=payload.prazo_dias_encomenda_esquecida,
    )
    set_request_timezone(model.timezone or DEFAULT_TIMEZONE)
    return {
        "timezone": model.timezone or DEFAULT_TIMEZONE,
        "prazo_dias_encomenda_esquecida": model.prazo_dias_encomenda_esquecida or 15,
    }
