from sqlalchemy import select
from sqlalchemy.orm import Session

from src.infrastructure.database.models import UsuarioModel


class UsuarioRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_all(self, condominio_id: int | None = None) -> list[UsuarioModel]:
        stmt = select(UsuarioModel).order_by(UsuarioModel.id.desc())
        if condominio_id is not None:
            stmt = stmt.where(UsuarioModel.condominio_id == condominio_id)
        return list(self.db.execute(stmt).scalars().all())

    def create(self, payload: dict) -> UsuarioModel:
        model = UsuarioModel(**payload)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def find_by_id(self, usuario_id: int, condominio_id: int | None = None) -> UsuarioModel | None:
        stmt = select(UsuarioModel).where(UsuarioModel.id == usuario_id)
        if condominio_id is not None:
            stmt = stmt.where(UsuarioModel.condominio_id == condominio_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def update(self, usuario_id: int, payload: dict, condominio_id: int | None = None) -> UsuarioModel | None:
        model = self.find_by_id(usuario_id, condominio_id=condominio_id)
        if model is None:
            return None
        for key, value in payload.items():
            setattr(model, key, value)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model
