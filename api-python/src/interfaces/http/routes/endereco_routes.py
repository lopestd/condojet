from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.dtos.endereco_dto import CreateEnderecoDTO
from src.application.dtos.endereco_v2_dto import CreateEnderecoV2DTO
from src.application.services.endereco_v2_service import (
    build_endereco_v2_label,
    validate_endereco_v2_payload_by_tipo_condominio,
)
from src.application.services.exceptions import AppError
from src.application.services.endereco_service import validate_endereco_payload
from src.infrastructure.database.session import get_db
from src.infrastructure.repositories.condominio_repository import CondominioRepository
from src.infrastructure.repositories.configuracao_repository import ConfiguracaoRepository
from src.infrastructure.repositories.enderecamento_referencia_repository import EnderecamentoReferenciaRepository
from src.infrastructure.repositories.endereco_morador_repository import EnderecoMoradorRepository
from src.infrastructure.repositories.endereco_repository import EnderecoRepository
from src.interfaces.http.dependencies.auth import Principal, require_roles

router = APIRouter(tags=["enderecos"])


@router.get("/enderecos")
def list_enderecos(
    principal: Principal = Depends(require_roles("ADMIN", "PORTEIRO")),
    db: Session = Depends(get_db),
) -> list[dict]:
    repository = EnderecoRepository(db)
    condominio_id = principal.condominio_id
    items = repository.list_all(condominio_id=condominio_id)
    return [
        {
            "id": item.id,
            "condominio_id": item.condominio_id,
            "tipo_endereco": item.tipo_endereco,
            "quadra": item.quadra,
            "conjunto": item.conjunto,
            "lote": item.lote,
            "setor_chacara": item.setor_chacara,
            "numero_chacara": item.numero_chacara,
        }
        for item in items
    ]


@router.post("/enderecos", status_code=201)
def create_endereco(
    payload: CreateEnderecoDTO,
    principal: Principal = Depends(require_roles("ADMIN", "PORTEIRO")),
    db: Session = Depends(get_db),
) -> dict:
    condominio_id = principal.condominio_id

    repository = EnderecoRepository(db)
    data = validate_endereco_payload(payload)
    data["condominio_id"] = condominio_id
    model = repository.create(data)
    return {"id": model.id}


@router.get("/enderecos/v2")
def list_enderecos_v2(
    principal: Principal = Depends(require_roles("ADMIN", "PORTEIRO")),
    db: Session = Depends(get_db),
) -> list[dict]:
    if principal.condominio_id is None:
        raise AppError("forbidden", status_code=403, code="forbidden")

    referencia_repository = EnderecamentoReferenciaRepository(db)
    tipos_condominio = {item.id: item for item in referencia_repository.list_tipos_condominio()}

    repository = EnderecoMoradorRepository(db)
    items = repository.list_all_with_refs(condominio_id=principal.condominio_id)
    response: list[dict] = []
    for endereco, tipo_logradouro, subtipo_logradouro in items:
        tipo_condominio = tipos_condominio.get(endereco.tipo_condominio_id)
        tipo_condominio_slug = tipo_condominio.slug if tipo_condominio is not None else None
        response.append(
            {
                "id": endereco.id,
                "condominio_id": endereco.condominio_id,
                "tipo_condominio_id": endereco.tipo_condominio_id,
                "tipo_condominio_slug": tipo_condominio_slug,
                "bloco": endereco.bloco,
                "andar": endereco.andar,
                "apartamento": endereco.apartamento,
                "tipo_logradouro_horizontal_id": endereco.tipo_logradouro_horizontal_id,
                "tipo_logradouro_nome": (
                    endereco.tipo_logradouro_horizontal_nome_livre
                    if endereco.tipo_logradouro_horizontal_nome_livre
                    else (tipo_logradouro.nome if tipo_logradouro is not None else None)
                ),
                "tipo_logradouro_campo_nome": (
                    endereco.tipo_logradouro_horizontal_campo_nome
                    if endereco.tipo_logradouro_horizontal_campo_nome
                    else (tipo_logradouro.nome if tipo_logradouro is not None else None)
                ),
                "subtipo_logradouro_horizontal_id": endereco.subtipo_logradouro_horizontal_id,
                "subtipo_logradouro_nome": (
                    endereco.subtipo_logradouro_horizontal_nome_livre
                    if endereco.subtipo_logradouro_horizontal_nome_livre
                    else (subtipo_logradouro.nome if subtipo_logradouro is not None else None)
                ),
                "subtipo_logradouro_campo_nome": (
                    endereco.subtipo_logradouro_horizontal_campo_nome
                    if endereco.subtipo_logradouro_horizontal_campo_nome
                    else (subtipo_logradouro.nome if subtipo_logradouro is not None else None)
                ),
                "numero": endereco.numero,
                "endereco_label": build_endereco_v2_label(
                    {
                        "tipo_condominio_slug": tipo_condominio_slug,
                        "bloco": endereco.bloco,
                        "andar": endereco.andar,
                        "apartamento": endereco.apartamento,
                        "tipo_logradouro_nome": (
                            tipo_logradouro.nome
                            if tipo_logradouro is not None
                            else endereco.tipo_logradouro_horizontal_nome_livre
                        ),
                        "subtipo_logradouro_nome": (
                            subtipo_logradouro.nome
                            if subtipo_logradouro is not None
                            else endereco.subtipo_logradouro_horizontal_nome_livre
                        ),
                        "numero": endereco.numero,
                    }
                ),
            }
        )
    return response


@router.post("/enderecos/v2", status_code=201)
def create_endereco_v2(
    payload: CreateEnderecoV2DTO,
    principal: Principal = Depends(require_roles("ADMIN", "PORTEIRO")),
    db: Session = Depends(get_db),
) -> dict:
    if principal.condominio_id is None:
        raise AppError("forbidden", status_code=403, code="forbidden")

    condominio_repository = CondominioRepository(db)
    condominio = condominio_repository.find_by_id(principal.condominio_id)
    if condominio is None:
        raise AppError("condominio_not_found", status_code=404, code="condominio_not_found")
    if not condominio.nome.strip() or condominio.tipo_condominio_id is None:
        raise AppError("condominio_config_incompleta", status_code=422, code="validation_error")

    referencia_repository = EnderecamentoReferenciaRepository(db)
    tipo_condominio = referencia_repository.find_tipo_condominio_by_id(condominio.tipo_condominio_id)
    if tipo_condominio is None:
        raise AppError("tipo_condominio_not_found", status_code=404, code="tipo_condominio_not_found")

    validate_endereco_v2_payload_by_tipo_condominio(
        tipo_condominio_slug=tipo_condominio.slug,
        bloco=payload.bloco,
        andar=payload.andar,
        apartamento=payload.apartamento,
        tipo_logradouro_horizontal_id=payload.tipo_logradouro_horizontal_id,
        tipo_logradouro_horizontal_nome=payload.tipo_logradouro_horizontal_nome,
        subtipo_logradouro_horizontal_id=payload.subtipo_logradouro_horizontal_id,
        subtipo_logradouro_horizontal_nome=payload.subtipo_logradouro_horizontal_nome,
        numero=payload.numero,
    )

    repository = EnderecoMoradorRepository(db)
    if tipo_condominio.slug == "PREDIO_CONJUNTO":
        duplicated = repository.find_by_predio_fields(
            principal.condominio_id,
            bloco=str(payload.bloco),
            andar=str(payload.andar),
            apartamento=str(payload.apartamento),
        )
        if duplicated is not None:
            return {"id": duplicated.id}
    else:
        configuracao_repository = ConfiguracaoRepository(db)
        configuracao = configuracao_repository.get_or_create(principal.condominio_id)
        tipo_logradouro = repository.find_tipo_logradouro_by_id(
            principal.condominio_id,
            int(payload.tipo_logradouro_horizontal_id),
        )
        subtipo_logradouro = repository.find_subtipo_logradouro_by_id(
            principal.condominio_id,
            int(payload.subtipo_logradouro_horizontal_id),
        )
        if tipo_logradouro is None or subtipo_logradouro is None:
            raise AppError("logradouro_referencia_not_found", status_code=404, code="logradouro_referencia_not_found")
        if subtipo_logradouro.tipo_logradouro_horizontal_id != tipo_logradouro.id:
            raise AppError("subtipo_not_belongs_to_tipo", status_code=422, code="validation_error")
        tipos_permitidos = set(configuracao.endereco_horizontal_tipos_permitidos_ids or [])
        subtipos_permitidos = set(configuracao.endereco_horizontal_subtipos_permitidos_ids or [])
        if tipos_permitidos and tipo_logradouro.id not in tipos_permitidos:
            raise AppError("tipo_logradouro_not_allowed", status_code=422, code="validation_error")
        if subtipos_permitidos and subtipo_logradouro.id not in subtipos_permitidos:
            raise AppError("subtipo_logradouro_not_allowed", status_code=422, code="validation_error")
        duplicated = repository.find_by_horizontal_fields(
            principal.condominio_id,
            tipo_logradouro_horizontal_id=tipo_logradouro.id,
            subtipo_logradouro_horizontal_id=subtipo_logradouro.id,
            numero=str(payload.numero),
        )
        if duplicated is not None:
            return {"id": duplicated.id}

    model = repository.create(
        {
            "condominio_id": principal.condominio_id,
            "tipo_condominio_id": tipo_condominio.id,
            "bloco": payload.bloco,
            "andar": payload.andar,
            "apartamento": payload.apartamento,
            "tipo_logradouro_horizontal_id": payload.tipo_logradouro_horizontal_id,
            "tipo_logradouro_horizontal_nome_livre": (
                str(payload.tipo_logradouro_horizontal_nome).strip() if payload.tipo_logradouro_horizontal_nome else None
            ),
            "tipo_logradouro_horizontal_campo_nome": (
                str(payload.tipo_logradouro_horizontal_campo_nome).strip()
                if payload.tipo_logradouro_horizontal_campo_nome
                else None
            ),
            "subtipo_logradouro_horizontal_id": payload.subtipo_logradouro_horizontal_id,
            "subtipo_logradouro_horizontal_nome_livre": (
                str(payload.subtipo_logradouro_horizontal_nome).strip()
                if payload.subtipo_logradouro_horizontal_nome
                else None
            ),
            "subtipo_logradouro_horizontal_campo_nome": (
                str(payload.subtipo_logradouro_horizontal_campo_nome).strip()
                if payload.subtipo_logradouro_horizontal_campo_nome
                else None
            ),
            "numero": payload.numero,
            "ativo": True,
        }
    )
    return {"id": model.id}
