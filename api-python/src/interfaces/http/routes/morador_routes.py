from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.dtos.morador_dto import CreateMoradorDTO, UpdateMoradorDTO
from src.application.services.exceptions import AppError
from src.infrastructure.database.session import get_db
from src.infrastructure.repositories.email_registry_repository import EmailRegistryRepository
from src.infrastructure.repositories.endereco_morador_repository import EnderecoMoradorRepository
from src.infrastructure.repositories.morador_repository import MoradorRepository
from src.infrastructure.security.password import hash_password
from src.interfaces.http.dependencies.auth import Principal, require_roles

router = APIRouter(tags=["moradores"])


@router.get("/moradores")
def list_moradores(
    principal: Principal = Depends(require_roles("ADMIN", "PORTEIRO")),
    db: Session = Depends(get_db),
) -> list[dict]:
    repository = MoradorRepository(db)
    condominio_id = principal.condominio_id
    items = repository.list_all(condominio_id=condominio_id)
    return [
        {
            "id": item.id,
            "condominio_id": item.condominio_id,
            "nome": item.nome,
            "telefone": item.telefone,
            "email": item.email,
            "endereco_id": item.endereco_id,
            "ativo": item.ativo,
        }
        for item in items
    ]


@router.post("/moradores", status_code=201)
def create_morador(
    payload: CreateMoradorDTO,
    principal: Principal = Depends(require_roles("ADMIN", "PORTEIRO")),
    db: Session = Depends(get_db),
) -> dict:
    condominio_id = principal.condominio_id

    endereco_repository = EnderecoMoradorRepository(db)
    if endereco_repository.find_by_id(payload.endereco_id, condominio_id=condominio_id) is None:
        raise AppError("endereco_not_found", status_code=404, code="endereco_not_found")

    email_registry_repository = EmailRegistryRepository(db)
    if email_registry_repository.find_owner(payload.email) is not None:
        raise AppError("email_already_exists", status_code=409, code="email_already_exists")

    repository = MoradorRepository(db)
    model = repository.create(
        {
            "condominio_id": condominio_id,
            "nome": payload.nome,
            "telefone": payload.telefone,
            "email": payload.email,
            "endereco_id": payload.endereco_id,
            "senha_hash": hash_password(payload.senha),
            "ativo": True,
        }
    )
    return {"id": model.id}


@router.put("/moradores/{morador_id}")
def update_morador(
    morador_id: int,
    payload: UpdateMoradorDTO,
    principal: Principal = Depends(require_roles("ADMIN", "PORTEIRO")),
    db: Session = Depends(get_db),
) -> dict:
    repository = MoradorRepository(db)
    condominio_id = principal.condominio_id
    current = repository.find_by_id(morador_id, condominio_id=condominio_id)
    if current is None:
        raise AppError("morador_not_found", status_code=404, code="morador_not_found")

    update_data = payload.model_dump(exclude_none=True)

    if "endereco_id" in update_data:
        endereco_repository = EnderecoMoradorRepository(db)
        if endereco_repository.find_by_id(int(update_data["endereco_id"]), condominio_id=condominio_id) is None:
            raise AppError("endereco_not_found", status_code=404, code="endereco_not_found")

    if "email" in update_data:
        next_email = str(update_data["email"]).strip().lower()
        current_email = str(current.email).strip().lower()
        if next_email != current_email:
            email_registry_repository = EmailRegistryRepository(db)
            owner = email_registry_repository.find_owner(str(update_data["email"]))
            if owner is not None:
                raise AppError("email_already_exists", status_code=409, code="email_already_exists")

    if "senha" in update_data:
        update_data["senha_hash"] = hash_password(update_data.pop("senha"))

    model = repository.update(morador_id, update_data, condominio_id=condominio_id)
    if model is None:
        raise AppError("morador_not_found", status_code=404, code="morador_not_found")

    return {"id": model.id, "updated": True}
