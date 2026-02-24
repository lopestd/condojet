from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.dtos.usuario_dto import CreateUsuarioDTO, UpdateUsuarioDTO
from src.application.services.exceptions import AppError
from src.infrastructure.database.session import get_db
from src.infrastructure.repositories.condominio_repository import CondominioRepository
from src.infrastructure.repositories.email_registry_repository import EmailRegistryRepository
from src.infrastructure.repositories.usuario_repository import UsuarioRepository
from src.infrastructure.security.password import hash_password
from src.interfaces.http.dependencies.auth import Principal, require_roles

router = APIRouter(tags=["usuarios"])


@router.get("/usuarios")
def list_usuarios(
    principal: Principal = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> list[dict]:
    repository = UsuarioRepository(db)
    condominio_id = principal.condominio_id
    items = repository.list_all(condominio_id=condominio_id)
    return [
        {
            "id": item.id,
            "condominio_id": item.condominio_id,
            "nome": item.nome,
            "email": item.email,
            "perfil": item.perfil,
            "ativo": item.ativo,
        }
        for item in items
    ]


@router.post("/usuarios", status_code=201)
def create_usuario(
    payload: CreateUsuarioDTO,
    principal: Principal = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> dict:
    condominio_id = principal.condominio_id
    if condominio_id is None:
        raise AppError("condominio_id_required", status_code=422, code="condominio_id_required")

    condominio_repository = CondominioRepository(db)
    if condominio_repository.find_by_id(condominio_id) is None:
        raise AppError("condominio_not_found", status_code=404, code="condominio_not_found")

    email_registry_repository = EmailRegistryRepository(db)
    if email_registry_repository.find_owner(payload.email) is not None:
        raise AppError("email_already_exists", status_code=409, code="email_already_exists")

    repository = UsuarioRepository(db)
    model = repository.create(
        {
            "condominio_id": condominio_id,
            "nome": payload.nome,
            "email": payload.email,
            "senha_hash": hash_password(payload.senha),
            "perfil": payload.perfil,
            "ativo": True,
        }
    )
    return {"id": model.id}


@router.put("/usuarios/{usuario_id}")
def update_usuario(
    usuario_id: int,
    payload: UpdateUsuarioDTO,
    principal: Principal = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
) -> dict:
    repository = UsuarioRepository(db)
    condominio_id = principal.condominio_id
    update_data = payload.model_dump(exclude_none=True)
    if "senha" in update_data:
        update_data["senha_hash"] = hash_password(update_data.pop("senha"))

    model = repository.update(usuario_id, update_data, condominio_id=condominio_id)
    if model is None:
        raise AppError("usuario_not_found", status_code=404, code="usuario_not_found")
    return {"id": model.id, "updated": True}
