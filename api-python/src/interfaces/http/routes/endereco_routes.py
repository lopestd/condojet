from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.dtos.endereco_dto import CreateEnderecoDTO
from src.application.services.endereco_service import validate_endereco_payload
from src.infrastructure.database.session import get_db
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
