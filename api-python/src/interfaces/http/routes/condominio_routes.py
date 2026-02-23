import secrets

from fastapi import APIRouter, Depends
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from src.application.dtos.condominio_dto import (
    CreateCondominioAdminUserDTO,
    CreateCondominioDTO,
    UpdateCondominioAdminUserDTO,
    UpdateCondominioDTO,
)
from src.application.services.exceptions import AppError
from src.infrastructure.database.models import CondominioModel, UsuarioModel
from src.infrastructure.database.session import get_db
from src.infrastructure.repositories.condominio_repository import CondominioRepository
from src.infrastructure.repositories.usuario_repository import UsuarioRepository
from src.infrastructure.security.password import hash_password
from src.interfaces.http.dependencies.auth import Principal, require_roles

router = APIRouter(tags=["condominios"])


def _generate_api_key() -> str:
    return f"condojet_{secrets.token_urlsafe(24)}"


@router.post("/condominios", status_code=201)
def create_condominio(
    payload: CreateCondominioDTO,
    principal: Principal = Depends(require_roles("ADMIN_GLOBAL")),
    db: Session = Depends(get_db),
) -> dict:
    if not principal.tenant_context.is_global:
        raise AppError("forbidden", status_code=403, code="forbidden")

    repository = CondominioRepository(db)
    if repository.find_by_name(payload.nome) is not None:
        raise AppError("condominio_already_exists", status_code=409, code="condominio_already_exists")

    api_key = _generate_api_key()
    while repository.find_by_api_key(api_key) is not None:
        api_key = _generate_api_key()

    model = CondominioModel(nome=payload.nome, api_key=api_key, ativo=True)
    admin = UsuarioModel(
        condominio_id=0,
        nome=payload.admin.nome,
        email=payload.admin.email,
        telefone=payload.admin.telefone,
        senha_hash=hash_password(payload.admin.senha),
        perfil="ADMIN",
        responsavel_sistema=True,
        ativo=True,
    )

    db.add(model)
    db.flush()
    admin.condominio_id = model.id
    db.add(admin)
    db.commit()

    db.refresh(model)
    db.refresh(admin)
    return {
        "id": model.id,
        "nome": model.nome,
        "ativo": model.ativo,
        "api_key": model.api_key,
        "admin": {"id": admin.id, "email": admin.email, "telefone": admin.telefone, "perfil": admin.perfil},
    }


@router.get("/admin/condominios")
def list_condominios(
    principal: Principal = Depends(require_roles("ADMIN_GLOBAL")),
    db: Session = Depends(get_db),
) -> list[dict]:
    if not principal.tenant_context.is_global:
        raise AppError("forbidden", status_code=403, code="forbidden")
    repository = CondominioRepository(db)
    items = repository.list_all()
    response: list[dict] = []
    for item in items:
        admin_stmt = (
            select(UsuarioModel)
            .where(
                UsuarioModel.condominio_id == item.id,
                UsuarioModel.perfil == "ADMIN",
                UsuarioModel.responsavel_sistema.is_(True),
            )
            .order_by(UsuarioModel.id.asc())
        )
        responsavel = db.execute(admin_stmt).scalars().first()
        response.append(
            {
                "id": item.id,
                "nome": item.nome,
                "ativo": item.ativo,
                "api_key": item.api_key,
                "responsavel_nome": responsavel.nome if responsavel is not None else None,
                "responsavel_telefone": responsavel.telefone if responsavel is not None else None,
            }
        )
    return response


@router.put("/admin/condominios/{condominio_id}")
def update_condominio(
    condominio_id: int,
    payload: UpdateCondominioDTO,
    principal: Principal = Depends(require_roles("ADMIN_GLOBAL")),
    db: Session = Depends(get_db),
) -> dict:
    if not principal.tenant_context.is_global:
        raise AppError("forbidden", status_code=403, code="forbidden")

    repository = CondominioRepository(db)
    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        raise AppError("at_least_one_field_required", status_code=422, code="validation_error")

    if "nome" in update_data:
        existing = repository.find_by_name(update_data["nome"])
        if existing is not None and existing.id != condominio_id:
            raise AppError("condominio_already_exists", status_code=409, code="condominio_already_exists")

    model = repository.update(condominio_id, update_data)
    if model is None:
        raise AppError("condominio_not_found", status_code=404, code="condominio_not_found")
    return {"id": model.id, "updated": True}


@router.post("/admin/condominios/{condominio_id}/admins", status_code=201)
def create_condominio_admin(
    condominio_id: int,
    payload: CreateCondominioAdminUserDTO,
    principal: Principal = Depends(require_roles("ADMIN_GLOBAL")),
    db: Session = Depends(get_db),
) -> dict:
    if not principal.tenant_context.is_global:
        raise AppError("forbidden", status_code=403, code="forbidden")
    condominio_repository = CondominioRepository(db)
    if condominio_repository.find_by_id(condominio_id) is None:
        raise AppError("condominio_not_found", status_code=404, code="condominio_not_found")

    usuario_repository = UsuarioRepository(db)
    model = usuario_repository.create(
        {
            "condominio_id": condominio_id,
            "nome": payload.nome,
            "email": payload.email,
            "telefone": payload.telefone,
            "senha_hash": hash_password(payload.senha),
            "perfil": "ADMIN",
            "responsavel_sistema": False,
            "ativo": True,
        }
    )
    return {"id": model.id}


@router.get("/admin/condominios/{condominio_id}/admins")
def list_condominio_admins(
    condominio_id: int,
    principal: Principal = Depends(require_roles("ADMIN_GLOBAL")),
    db: Session = Depends(get_db),
) -> list[dict]:
    if not principal.tenant_context.is_global:
        raise AppError("forbidden", status_code=403, code="forbidden")
    condominio_repository = CondominioRepository(db)
    if condominio_repository.find_by_id(condominio_id) is None:
        raise AppError("condominio_not_found", status_code=404, code="condominio_not_found")

    usuario_repository = UsuarioRepository(db)
    items = usuario_repository.list_all(condominio_id=condominio_id)
    admins = [item for item in items if item.perfil == "ADMIN"]
    return [
        {
            "id": item.id,
            "condominio_id": item.condominio_id,
            "nome": item.nome,
            "email": item.email,
            "telefone": item.telefone,
            "perfil": item.perfil,
            "responsavel_sistema": item.responsavel_sistema,
            "ativo": item.ativo,
        }
        for item in admins
    ]


@router.put("/admin/condominios/{condominio_id}/admins/{usuario_id}")
def update_condominio_admin(
    condominio_id: int,
    usuario_id: int,
    payload: UpdateCondominioAdminUserDTO,
    principal: Principal = Depends(require_roles("ADMIN_GLOBAL")),
    db: Session = Depends(get_db),
) -> dict:
    if not principal.tenant_context.is_global:
        raise AppError("forbidden", status_code=403, code="forbidden")
    condominio_repository = CondominioRepository(db)
    if condominio_repository.find_by_id(condominio_id) is None:
        raise AppError("condominio_not_found", status_code=404, code="condominio_not_found")

    usuario_repository = UsuarioRepository(db)
    model = usuario_repository.find_by_id(usuario_id, condominio_id=condominio_id)
    if model is None or model.perfil != "ADMIN":
        raise AppError("usuario_admin_not_found", status_code=404, code="usuario_admin_not_found")

    update_data = payload.model_dump(exclude_none=True)
    if "senha" in update_data:
        update_data["senha_hash"] = hash_password(update_data.pop("senha"))
    if not update_data:
        raise AppError("at_least_one_field_required", status_code=422, code="validation_error")
    admins = [item for item in usuario_repository.list_all(condominio_id=condominio_id) if item.perfil == "ADMIN"]
    if "ativo" in update_data and update_data["ativo"] is False and model.ativo:
        active_admins = [item for item in admins if item.ativo]
        if len(active_admins) <= 1:
            raise AppError("last_active_admin_blocked", status_code=409, code="last_active_admin_blocked")
        if model.responsavel_sistema:
            another_responsavel = any(item.id != model.id and item.responsavel_sistema for item in admins)
            if not another_responsavel:
                raise AppError(
                    "responsavel_admin_inactivation_blocked",
                    status_code=409,
                    code="responsavel_admin_inactivation_blocked",
                )

    if "responsavel_sistema" in update_data:
        if update_data["responsavel_sistema"] is True and not model.responsavel_sistema:
            db.execute(
                update(UsuarioModel)
                .where(
                    UsuarioModel.condominio_id == condominio_id,
                    UsuarioModel.perfil == "ADMIN",
                    UsuarioModel.id != model.id,
                    UsuarioModel.responsavel_sistema.is_(True),
                )
                .values(responsavel_sistema=False)
            )
            db.flush()
        if update_data["responsavel_sistema"] is False and model.responsavel_sistema:
            another_responsavel = any(item.id != model.id and item.responsavel_sistema for item in admins)
            if not another_responsavel:
                raise AppError("last_responsavel_blocked", status_code=409, code="last_responsavel_blocked")

    updated = usuario_repository.update(usuario_id, update_data, condominio_id=condominio_id)
    if updated is None:
        raise AppError("usuario_admin_not_found", status_code=404, code="usuario_admin_not_found")
    return {"id": updated.id, "updated": True}
