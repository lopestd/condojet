from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.application.dtos.empresa_responsavel_global_dto import (
    CreateEmpresaResponsavelGlobalDTO,
    UpdateEmpresaResponsavelGlobalDTO,
)
from src.application.services.exceptions import AppError
from src.infrastructure.database.session import get_db
from src.infrastructure.repositories.empresa_responsavel_global_repository import EmpresaResponsavelGlobalRepository
from src.interfaces.http.dependencies.auth import Principal, require_roles

router = APIRouter(tags=["empresas_responsaveis_globais"])


def normalize_company_name(value: str) -> str:
    return " ".join(value.strip().split()).upper()


@router.get("/empresas-responsaveis-globais")
def list_empresas_responsaveis_globais(
    incluir_inativas: bool = Query(default=False),
    principal: Principal = Depends(require_roles("ADMIN_GLOBAL", "ADMIN", "PORTEIRO")),
    db: Session = Depends(get_db),
) -> list[dict]:
    repository = EmpresaResponsavelGlobalRepository(db)
    allow_inactive = incluir_inativas if principal.role == "ADMIN_GLOBAL" else False
    items = repository.list_all(incluir_inativas=allow_inactive)
    return [{"id": item.id, "nome": item.nome, "ativo": item.ativo} for item in items]


@router.post("/empresas-responsaveis-globais", status_code=201)
def create_empresa_responsavel_global(
    payload: CreateEmpresaResponsavelGlobalDTO,
    _principal: Principal = Depends(require_roles("ADMIN_GLOBAL")),
    db: Session = Depends(get_db),
) -> dict:
    repository = EmpresaResponsavelGlobalRepository(db)
    nome = " ".join(payload.nome.strip().split())
    nome_normalizado = normalize_company_name(nome)

    if repository.find_by_nome_normalizado(nome_normalizado) is not None:
        raise AppError("empresa_responsavel_duplicada", status_code=409, code="empresa_responsavel_duplicada")

    model = repository.create(nome=nome, nome_normalizado=nome_normalizado)
    return {"id": model.id, "nome": model.nome, "ativo": model.ativo}


@router.put("/empresas-responsaveis-globais/{empresa_id}")
def update_empresa_responsavel_global(
    empresa_id: int,
    payload: UpdateEmpresaResponsavelGlobalDTO,
    _principal: Principal = Depends(require_roles("ADMIN_GLOBAL")),
    db: Session = Depends(get_db),
) -> dict:
    repository = EmpresaResponsavelGlobalRepository(db)
    model = repository.find_by_id(empresa_id)
    if model is None:
        raise AppError("empresa_responsavel_not_found", status_code=404, code="empresa_responsavel_not_found")

    update_payload: dict = {}
    if payload.nome is not None:
        nome = " ".join(payload.nome.strip().split())
        nome_normalizado = normalize_company_name(nome)
        existing = repository.find_by_nome_normalizado(nome_normalizado)
        if existing is not None and existing.id != model.id:
            raise AppError("empresa_responsavel_duplicada", status_code=409, code="empresa_responsavel_duplicada")
        update_payload["nome"] = nome
        update_payload["nome_normalizado"] = nome_normalizado

    if payload.ativo is not None:
        update_payload["ativo"] = payload.ativo

    if not update_payload:
        raise AppError("payload_vazio", status_code=422, code="payload_vazio")

    updated = repository.update(model, update_payload)
    return {"id": updated.id, "nome": updated.nome, "ativo": updated.ativo}
