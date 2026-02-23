from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.dtos.encomenda_dto import CreateEncomendaDTO, EntregarEncomendaDTO, ReabrirEncomendaDTO
from src.application.services.encomenda_service import (
    build_encomenda_payload,
    ensure_entrega_allowed,
    ensure_morador_endereco_consistency,
    ensure_reabertura_allowed,
)
from src.infrastructure.database.session import get_db
from src.infrastructure.repositories.encomenda_repository import EncomendaRepository
from src.infrastructure.repositories.morador_repository import MoradorRepository
from src.interfaces.http.dependencies.auth import Principal, require_roles

router = APIRouter(tags=["encomendas"])


@router.post("/encomendas", status_code=201)
def create_encomenda(
    payload: CreateEncomendaDTO,
    principal: Principal = Depends(require_roles("ADMIN", "PORTEIRO")),
    db: Session = Depends(get_db),
) -> dict:
    condominio_id = principal.condominio_id

    morador_repository = MoradorRepository(db)
    morador = morador_repository.find_by_id(payload.morador_id, condominio_id=condominio_id)
    ensure_morador_endereco_consistency(morador, payload.endereco_id)

    repository = EncomendaRepository(db)
    model = repository.create(build_encomenda_payload(payload.model_dump(), principal.user_id, condominio_id))
    return {"id": model.id, "codigo_interno": model.codigo_interno, "status": model.status}


@router.get("/encomendas")
def list_encomendas(
    principal: Principal = Depends(require_roles("ADMIN", "PORTEIRO")),
    db: Session = Depends(get_db),
) -> list[dict]:
    repository = EncomendaRepository(db)
    condominio_id = principal.condominio_id
    items = repository.list_all(condominio_id=condominio_id)
    return [
        {
            "id": item.id,
            "condominio_id": item.condominio_id,
            "codigo_interno": item.codigo_interno,
            "status": item.status,
            "tipo": item.tipo,
            "morador_id": item.morador_id,
            "endereco_id": item.endereco_id,
        }
        for item in items
    ]


@router.get("/encomendas/{encomenda_id}")
def get_encomenda(
    encomenda_id: int,
    principal: Principal = Depends(require_roles("ADMIN", "PORTEIRO")),
    db: Session = Depends(get_db),
) -> dict:
    repository = EncomendaRepository(db)
    condominio_id = principal.condominio_id
    item = repository.find_by_id(encomenda_id, condominio_id=condominio_id)
    if item is None:
        from src.application.services.exceptions import AppError

        raise AppError("encomenda_not_found", status_code=404, code="encomenda_not_found")

    return {
        "id": item.id,
        "condominio_id": item.condominio_id,
        "codigo_interno": item.codigo_interno,
        "status": item.status,
        "tipo": item.tipo,
        "morador_id": item.morador_id,
        "endereco_id": item.endereco_id,
    }


@router.put("/encomendas/{encomenda_id}/entregar")
def entregar_encomenda(
    encomenda_id: int,
    payload: EntregarEncomendaDTO,
    principal: Principal = Depends(require_roles("ADMIN", "PORTEIRO")),
    db: Session = Depends(get_db),
) -> dict:
    repository = EncomendaRepository(db)
    condominio_id = principal.condominio_id
    item = ensure_entrega_allowed(repository.find_by_id(encomenda_id, condominio_id=condominio_id))
    updated = repository.entregar(item, principal.user_id, payload.retirado_por_nome)
    return {"id": updated.id, "status": updated.status}


@router.put("/encomendas/{encomenda_id}/reabrir")
def reabrir_encomenda(
    encomenda_id: int,
    payload: ReabrirEncomendaDTO,
    principal: Principal = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> dict:
    repository = EncomendaRepository(db)
    condominio_id = principal.condominio_id
    item = ensure_reabertura_allowed(
        repository.find_by_id(encomenda_id, condominio_id=condominio_id), payload.motivo_reabertura
    )
    updated = repository.reabrir(item, principal.user_id, payload.motivo_reabertura)
    return {"id": updated.id, "status": updated.status}


@router.get("/minhas-encomendas")
def minhas_encomendas(
    principal: Principal = Depends(require_roles("MORADOR")),
    db: Session = Depends(get_db),
) -> list[dict]:
    repository = EncomendaRepository(db)
    condominio_id = principal.condominio_id
    items = repository.list_by_morador(principal.user_id, condominio_id=condominio_id)
    return [
        {
            "id": item.id,
            "codigo_interno": item.codigo_interno,
            "status": item.status,
            "tipo": item.tipo,
        }
        for item in items
    ]
