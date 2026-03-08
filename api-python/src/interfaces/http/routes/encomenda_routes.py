from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.dtos.encomenda_dto import (
    CreateEncomendaDTO,
    EntregarEncomendaDTO,
    ReabrirEncomendaDTO,
    UpdateEncomendaDTO,
)
from src.application.services.endereco_v2_service import build_endereco_v2_label
from src.application.services.encomenda_service import (
    build_encomenda_payload,
    ensure_delete_allowed,
    ensure_entrega_allowed,
    ensure_morador_endereco_consistency,
    ensure_reabertura_allowed,
    ensure_update_allowed,
)
from src.application.services.encomenda_notification_service import notify_encomenda_whatsapp
from src.application.services.exceptions import AppError
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
    notify_success, notify_error = notify_encomenda_whatsapp(db, model, morador)
    repository.register_notification_result(model, notify_success, "whatsapp_notify", notify_error)
    return {"id": model.id, "codigo_interno": model.codigo_interno, "status": model.status}


@router.get("/encomendas")
def list_encomendas(
    principal: Principal = Depends(require_roles("ADMIN", "PORTEIRO")),
    db: Session = Depends(get_db),
) -> list[dict]:
    repository = EncomendaRepository(db)
    condominio_id = principal.condominio_id
    items = repository.list_all_with_details(condominio_id=condominio_id)
    return [
        {
            "id": item.id,
            "condominio_id": item.condominio_id,
            "codigo_interno": item.codigo_interno,
            "codigo_externo": item.codigo_externo,
            "status": item.status,
            "tipo": item.tipo,
            "data_recebimento": item.data_recebimento,
            "hora_recebimento": item.hora_recebimento,
            "data_entrega": item.data_entrega,
            "morador_id": item.morador_id,
            "morador_nome": morador_nome,
            "endereco_id": item.endereco_id,
            "notificado_em": item.notificado_em,
            "notificado_por": item.notificado_por,
            "notificacao_status": item.notificacao_status,
            "notificacao_erro": item.notificacao_erro,
            "endereco_label": build_endereco_v2_label(
                {
                    "tipo_condominio_slug": tipo_condominio.slug if tipo_condominio is not None else None,
                    "bloco": endereco.bloco if endereco is not None else None,
                    "andar": endereco.andar if endereco is not None else None,
                    "apartamento": endereco.apartamento if endereco is not None else None,
                    "tipo_logradouro_nome": tipo_logradouro.nome if tipo_logradouro is not None else None,
                    "subtipo_logradouro_nome": subtipo_logradouro.nome if subtipo_logradouro is not None else None,
                    "numero": endereco.numero if endereco is not None else None,
                }
                if endereco is not None
                else None
            ),
        }
        for item, morador_nome, endereco, tipo_condominio, tipo_logradouro, subtipo_logradouro in items
    ]


@router.get("/encomendas/{encomenda_id}")
def get_encomenda(
    encomenda_id: int,
    principal: Principal = Depends(require_roles("ADMIN", "PORTEIRO")),
    db: Session = Depends(get_db),
) -> dict:
    repository = EncomendaRepository(db)
    condominio_id = principal.condominio_id
    details = repository.find_by_id_with_details(encomenda_id, condominio_id=condominio_id)
    if details is None:
        raise AppError("encomenda_not_found", status_code=404, code="encomenda_not_found")

    item, morador_nome, endereco, tipo_condominio, tipo_logradouro, subtipo_logradouro = details

    return {
        "id": item.id,
        "condominio_id": item.condominio_id,
        "codigo_interno": item.codigo_interno,
        "status": item.status,
        "tipo": item.tipo,
        "morador_id": item.morador_id,
        "morador_nome": morador_nome,
        "endereco_id": item.endereco_id,
        "endereco_label": build_endereco_v2_label(
            {
                "tipo_condominio_slug": tipo_condominio.slug if tipo_condominio is not None else None,
                "bloco": endereco.bloco if endereco is not None else None,
                "andar": endereco.andar if endereco is not None else None,
                "apartamento": endereco.apartamento if endereco is not None else None,
                "tipo_logradouro_nome": tipo_logradouro.nome if tipo_logradouro is not None else None,
                "subtipo_logradouro_nome": subtipo_logradouro.nome if subtipo_logradouro is not None else None,
                "numero": endereco.numero if endereco is not None else None,
            }
            if endereco is not None
            else None
        ),
        "codigo_externo": item.codigo_externo,
        "descricao": item.descricao,
        "empresa_entregadora": item.empresa_entregadora,
        "data_recebimento": item.data_recebimento,
        "hora_recebimento": item.hora_recebimento,
        "data_entrega": item.data_entrega,
        "entregue_por_usuario_id": item.entregue_por_usuario_id,
        "retirado_por_nome": item.retirado_por_nome,
        "motivo_reabertura": item.motivo_reabertura,
        "reaberto_por_usuario_id": item.reaberto_por_usuario_id,
        "reaberto_em": item.reaberto_em,
        "notificado_em": item.notificado_em,
        "notificado_por": item.notificado_por,
        "notificacao_status": item.notificacao_status,
        "notificacao_erro": item.notificacao_erro,
    }


@router.put("/encomendas/{encomenda_id}")
def update_encomenda(
    encomenda_id: int,
    payload: UpdateEncomendaDTO,
    principal: Principal = Depends(require_roles("ADMIN", "PORTEIRO")),
    db: Session = Depends(get_db),
) -> dict:
    repository = EncomendaRepository(db)
    condominio_id = principal.condominio_id
    current = ensure_update_allowed(repository.find_by_id(encomenda_id, condominio_id=condominio_id))

    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        raise AppError("at_least_one_field_required", status_code=422, code="at_least_one_field_required")

    effective_morador_id = int(update_data.get("morador_id", current.morador_id))
    effective_endereco_id = int(update_data.get("endereco_id", current.endereco_id))

    morador_repository = MoradorRepository(db)
    morador = morador_repository.find_by_id(effective_morador_id, condominio_id=condominio_id)
    ensure_morador_endereco_consistency(morador, effective_endereco_id)

    updated = repository.update(current, update_data)
    return {"id": updated.id, "status": updated.status}


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


@router.delete("/encomendas/{encomenda_id}", status_code=204)
def delete_encomenda(
    encomenda_id: int,
    principal: Principal = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> None:
    repository = EncomendaRepository(db)
    condominio_id = principal.condominio_id
    item = ensure_delete_allowed(repository.find_by_id(encomenda_id, condominio_id=condominio_id))
    repository.delete(item)
    return None


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
            "codigo_externo": item.codigo_externo,
            "status": item.status,
            "tipo": item.tipo,
            "empresa_entregadora": item.empresa_entregadora,
            "data_recebimento": item.data_recebimento.isoformat() if item.data_recebimento else None,
            "data_entrega": item.data_entrega.isoformat() if item.data_entrega else None,
            "retirado_por_nome": item.retirado_por_nome,
        }
        for item in items
    ]


@router.get("/minhas-encomendas/{encomenda_id}")
def get_minha_encomenda(
    encomenda_id: int,
    principal: Principal = Depends(require_roles("MORADOR")),
    db: Session = Depends(get_db),
) -> dict:
    repository = EncomendaRepository(db)
    condominio_id = principal.condominio_id
    details = repository.find_by_id_with_details(encomenda_id, condominio_id=condominio_id)
    if details is None:
        raise AppError("encomenda_not_found", status_code=404, code="encomenda_not_found")

    item, morador_nome, endereco, tipo_condominio, tipo_logradouro, subtipo_logradouro = details
    if item.morador_id != principal.user_id:
        raise AppError("encomenda_not_found", status_code=404, code="encomenda_not_found")

    return {
        "id": item.id,
        "condominio_id": item.condominio_id,
        "codigo_interno": item.codigo_interno,
        "status": item.status,
        "tipo": item.tipo,
        "morador_id": item.morador_id,
        "morador_nome": morador_nome,
        "endereco_id": item.endereco_id,
        "endereco_label": build_endereco_v2_label(
            {
                "tipo_condominio_slug": tipo_condominio.slug if tipo_condominio is not None else None,
                "bloco": endereco.bloco if endereco is not None else None,
                "andar": endereco.andar if endereco is not None else None,
                "apartamento": endereco.apartamento if endereco is not None else None,
                "tipo_logradouro_nome": tipo_logradouro.nome if tipo_logradouro is not None else None,
                "subtipo_logradouro_nome": subtipo_logradouro.nome if subtipo_logradouro is not None else None,
                "numero": endereco.numero if endereco is not None else None,
            }
            if endereco is not None
            else None
        ),
        "codigo_externo": item.codigo_externo,
        "descricao": item.descricao,
        "empresa_entregadora": item.empresa_entregadora,
        "data_recebimento": item.data_recebimento,
        "hora_recebimento": item.hora_recebimento,
        "data_entrega": item.data_entrega,
        "entregue_por_usuario_id": item.entregue_por_usuario_id,
        "retirado_por_nome": item.retirado_por_nome,
        "motivo_reabertura": item.motivo_reabertura,
        "reaberto_por_usuario_id": item.reaberto_por_usuario_id,
        "reaberto_em": item.reaberto_em,
        "notificado_em": item.notificado_em,
        "notificado_por": item.notificado_por,
        "notificacao_status": item.notificacao_status,
        "notificacao_erro": item.notificacao_erro,
    }
