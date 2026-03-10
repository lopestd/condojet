from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.dtos.condominio_config_dto import UpdateCondominioConfigDTO
from src.application.dtos.configuracao_dto import UpdateConfiguracaoDTO
from src.application.services.exceptions import AppError
from src.infrastructure.database.session import get_db
from src.infrastructure.repositories.condominio_repository import CondominioRepository
from src.infrastructure.repositories.configuracao_repository import ConfiguracaoRepository
from src.infrastructure.repositories.enderecamento_referencia_repository import EnderecamentoReferenciaRepository
from src.infrastructure.timezone import DEFAULT_TIMEZONE, set_request_timezone
from src.interfaces.http.dependencies.auth import Principal, require_roles

router = APIRouter(tags=["configuracoes"])


def _uniq_preserve_order(values: list[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for item in values:
        normalized = item.strip().lower()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        result.append(item.strip())
    return result


def _build_parametros_enderecamento(config) -> dict:
    return {
        "predio_rotulo_bloco": config.endereco_predio_rotulo_bloco,
        "predio_rotulo_andar": config.endereco_predio_rotulo_andar,
        "predio_rotulo_apartamento": config.endereco_predio_rotulo_apartamento,
        "horizontal_rotulo_tipo": config.endereco_horizontal_rotulo_tipo,
        "horizontal_rotulo_subtipo": config.endereco_horizontal_rotulo_subtipo,
        "horizontal_rotulo_numero": config.endereco_horizontal_rotulo_numero,
        "horizontal_hint_tipo": config.endereco_horizontal_hint_tipo,
        "horizontal_hint_subtipo": config.endereco_horizontal_hint_subtipo,
        "horizontal_tipos_permitidos_ids": config.endereco_horizontal_tipos_permitidos_ids or [],
        "horizontal_subtipos_permitidos_ids": config.endereco_horizontal_subtipos_permitidos_ids or [],
        "horizontal_tipos_permitidos_nomes": config.endereco_horizontal_tipos_permitidos_nomes or [],
        "horizontal_subtipos_permitidos_nomes": config.endereco_horizontal_subtipos_permitidos_nomes or [],
    }


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


@router.get("/configuracoes/condominio")
def get_configuracao_condominio(
    principal: Principal = Depends(require_roles("ADMIN", "PORTEIRO")),
    db: Session = Depends(get_db),
) -> dict:
    if principal.condominio_id is None:
        raise AppError("forbidden", status_code=403, code="forbidden")

    condominio_repository = CondominioRepository(db)
    configuracao_repository = ConfiguracaoRepository(db)
    referencia_repository = EnderecamentoReferenciaRepository(db)
    condominio = condominio_repository.find_by_id(principal.condominio_id)
    if condominio is None:
        raise AppError("condominio_not_found", status_code=404, code="condominio_not_found")
    configuracao = configuracao_repository.get_or_create(principal.condominio_id)

    tipo_condominio = None
    if condominio.tipo_condominio_id is not None:
        tipo_condominio = referencia_repository.find_tipo_condominio_by_id(condominio.tipo_condominio_id)

    return {
        "condominio_id": condominio.id,
        "nome_condominio": condominio.nome,
        "tipo_condominio_id": condominio.tipo_condominio_id,
        "tipo_condominio_nome": tipo_condominio.nome if tipo_condominio is not None else None,
        "tipo_condominio_slug": tipo_condominio.slug if tipo_condominio is not None else None,
        "parametros_enderecamento": _build_parametros_enderecamento(configuracao),
    }


@router.put("/configuracoes/condominio")
def update_configuracao_condominio(
    payload: UpdateCondominioConfigDTO,
    principal: Principal = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> dict:
    if principal.condominio_id is None:
        raise AppError("forbidden", status_code=403, code="forbidden")

    referencia_repository = EnderecamentoReferenciaRepository(db)
    tipo_condominio = referencia_repository.find_tipo_condominio_by_id(payload.tipo_condominio_id)
    if tipo_condominio is None:
        raise AppError("tipo_condominio_not_found", status_code=404, code="tipo_condominio_not_found")

    condominio_repository = CondominioRepository(db)
    configuracao_repository = ConfiguracaoRepository(db)
    updated = condominio_repository.update_configuracao_basica(
        principal.condominio_id,
        nome=payload.nome_condominio,
        tipo_condominio_id=payload.tipo_condominio_id,
    )
    if updated is None:
        raise AppError("condominio_not_found", status_code=404, code="condominio_not_found")

    if payload.parametros_enderecamento is not None:
        tipos_ids = payload.parametros_enderecamento.horizontal_tipos_permitidos_ids
        subtipos_ids = payload.parametros_enderecamento.horizontal_subtipos_permitidos_ids
        tipos_nomes = _uniq_preserve_order(payload.parametros_enderecamento.horizontal_tipos_permitidos_nomes)
        subtipos_nomes = _uniq_preserve_order(payload.parametros_enderecamento.horizontal_subtipos_permitidos_nomes)

        if tipo_condominio.slug == "HORIZONTAL":
            if len(tipos_nomes) == 0:
                raise AppError("tipo_logradouro_obrigatorio", status_code=422, code="validation_error")
            if len(subtipos_nomes) == 0:
                raise AppError("subtipo_logradouro_obrigatorio", status_code=422, code="validation_error")

            tipos_ids = []
            for index, tipo_nome in enumerate(tipos_nomes, start=1):
                tipo_ref = referencia_repository.find_tipo_logradouro_by_nome(principal.condominio_id, tipo_nome)
                if tipo_ref is None:
                    tipo_ref = referencia_repository.create_tipo_logradouro(
                        principal.condominio_id,
                        nome=tipo_nome,
                        ordem_exibicao=index * 10,
                    )
                tipos_ids.append(tipo_ref.id)

            subtipos_ids = []
            for tipo_id in tipos_ids:
                for index, subtipo_nome in enumerate(subtipos_nomes, start=1):
                    subtipo_ref = referencia_repository.find_subtipo_logradouro_by_nome(
                        principal.condominio_id,
                        tipo_logradouro_horizontal_id=tipo_id,
                        nome=subtipo_nome,
                    )
                    if subtipo_ref is None:
                        subtipo_ref = referencia_repository.create_subtipo_logradouro(
                            principal.condominio_id,
                            tipo_logradouro_horizontal_id=tipo_id,
                            nome=subtipo_nome,
                            ordem_exibicao=index * 10,
                        )
                    subtipos_ids.append(subtipo_ref.id)
            db.commit()
            tipos_nomes = []
            subtipos_nomes = []
        else:
            tipos_ids = []
            subtipos_ids = []
            tipos_nomes = []
            subtipos_nomes = []

        configuracao = configuracao_repository.upsert_parametros_enderecamento(
            principal.condominio_id,
            predio_rotulo_bloco=payload.parametros_enderecamento.predio_rotulo_bloco,
            predio_rotulo_andar=payload.parametros_enderecamento.predio_rotulo_andar,
            predio_rotulo_apartamento=payload.parametros_enderecamento.predio_rotulo_apartamento,
            horizontal_rotulo_tipo=payload.parametros_enderecamento.horizontal_rotulo_tipo,
            horizontal_rotulo_subtipo=payload.parametros_enderecamento.horizontal_rotulo_subtipo,
            horizontal_rotulo_numero=payload.parametros_enderecamento.horizontal_rotulo_numero,
            horizontal_hint_tipo=payload.parametros_enderecamento.horizontal_hint_tipo,
            horizontal_hint_subtipo=payload.parametros_enderecamento.horizontal_hint_subtipo,
            horizontal_tipos_permitidos_ids=tipos_ids,
            horizontal_subtipos_permitidos_ids=subtipos_ids,
            horizontal_tipos_permitidos_nomes=tipos_nomes,
            horizontal_subtipos_permitidos_nomes=subtipos_nomes,
        )
    else:
        configuracao = configuracao_repository.get_or_create(principal.condominio_id)

    return {
        "condominio_id": updated.id,
        "nome_condominio": updated.nome,
        "tipo_condominio_id": updated.tipo_condominio_id,
        "tipo_condominio_nome": tipo_condominio.nome,
        "tipo_condominio_slug": tipo_condominio.slug,
        "parametros_enderecamento": _build_parametros_enderecamento(configuracao),
    }


@router.get("/configuracoes/enderecos/referencias")
def get_enderecos_referencias(
    principal: Principal = Depends(require_roles("ADMIN", "PORTEIRO")),
    db: Session = Depends(get_db),
) -> dict:
    if principal.condominio_id is None and principal.role != "ADMIN_GLOBAL":
        raise AppError("forbidden", status_code=403, code="forbidden")

    repository = EnderecamentoReferenciaRepository(db)
    tipos_condominio = repository.list_tipos_condominio()
    tipos_horizontal = repository.list_tipos_logradouro_horizontal(principal.condominio_id)
    subtipos_horizontal = repository.list_subtipos_logradouro_horizontal(principal.condominio_id)

    return {
        "tipos_condominio": [
            {"id": item.id, "nome": item.nome, "slug": item.slug}
            for item in tipos_condominio
        ],
        "tipos_logradouro_horizontal": [
            {"id": item.id, "nome": item.nome, "slug": item.slug, "ordem_exibicao": item.ordem_exibicao}
            for item in tipos_horizontal
        ],
        "subtipos_logradouro_horizontal": [
            {
                "id": item.id,
                "tipo_logradouro_horizontal_id": item.tipo_logradouro_horizontal_id,
                "nome": item.nome,
                "slug": item.slug,
                "ordem_exibicao": item.ordem_exibicao,
            }
            for item in subtipos_horizontal
        ],
    }
