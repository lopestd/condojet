from sqlalchemy import select
from sqlalchemy.orm import Session

from src.infrastructure.database.models import MoradorModel


class MoradorRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_all(self, condominio_id: int | None = None) -> list[MoradorModel]:
        stmt = select(MoradorModel).order_by(MoradorModel.id.desc())
        if condominio_id is not None:
            stmt = stmt.where(MoradorModel.condominio_id == condominio_id)
        return list(self.db.execute(stmt).scalars().all())

    def create(self, payload: dict) -> MoradorModel:
        model = MoradorModel(**payload)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def find_by_id(self, morador_id: int, condominio_id: int | None = None) -> MoradorModel | None:
        stmt = select(MoradorModel).where(MoradorModel.id == morador_id)
        if condominio_id is not None:
            stmt = stmt.where(MoradorModel.condominio_id == condominio_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def update(self, morador_id: int, payload: dict, condominio_id: int | None = None) -> MoradorModel | None:
        model = self.find_by_id(morador_id, condominio_id=condominio_id)
        if model is None:
            return None
        for key, value in payload.items():
            setattr(model, key, value)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model
