from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from src.infrastructure.database.models import CondominioModel


class CondominioRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def find_by_api_key(self, api_key: str) -> CondominioModel | None:
        stmt = select(CondominioModel).where(CondominioModel.api_key == api_key, CondominioModel.ativo.is_(True))
        return self.db.execute(stmt).scalar_one_or_none()

    def find_by_id(self, condominio_id: int) -> CondominioModel | None:
        stmt = select(CondominioModel).where(CondominioModel.id == condominio_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def list_all(self) -> list[CondominioModel]:
        stmt = select(CondominioModel).order_by(CondominioModel.id.desc())
        return list(self.db.execute(stmt).scalars().all())

    def create(self, payload: dict) -> CondominioModel:
        model = CondominioModel(**payload)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def find_by_name(self, nome: str) -> CondominioModel | None:
        stmt = select(CondominioModel).where(or_(CondominioModel.nome == nome, CondominioModel.nome.ilike(nome)))
        return self.db.execute(stmt).scalar_one_or_none()

    def update(self, condominio_id: int, payload: dict) -> CondominioModel | None:
        model = self.find_by_id(condominio_id)
        if model is None:
            return None
        for key, value in payload.items():
            setattr(model, key, value)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def update_configuracao_basica(
        self,
        condominio_id: int,
        *,
        nome: str,
        tipo_condominio_id: int,
    ) -> CondominioModel | None:
        model = self.find_by_id(condominio_id)
        if model is None:
            return None
        model.nome = nome
        model.tipo_condominio_id = tipo_condominio_id
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model
