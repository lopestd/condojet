from sqlalchemy import select
from sqlalchemy.orm import Session

from src.infrastructure.database.models import EnderecoModel


class EnderecoRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_all(self, condominio_id: int | None = None) -> list[EnderecoModel]:
        stmt = select(EnderecoModel).order_by(EnderecoModel.id.desc())
        if condominio_id is not None:
            stmt = stmt.where(EnderecoModel.condominio_id == condominio_id)
        return list(self.db.execute(stmt).scalars().all())

    def create(self, payload: dict) -> EnderecoModel:
        model = EnderecoModel(**payload)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def find_by_id(self, endereco_id: int, condominio_id: int | None = None) -> EnderecoModel | None:
        stmt = select(EnderecoModel).where(EnderecoModel.id == endereco_id)
        if condominio_id is not None:
            stmt = stmt.where(EnderecoModel.condominio_id == condominio_id)
        return self.db.execute(stmt).scalar_one_or_none()
