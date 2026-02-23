from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.infrastructure.database.models import EncomendaModel


class EncomendaRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, payload: dict) -> EncomendaModel:
        model = EncomendaModel(**payload)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def find_by_id(self, encomenda_id: int, condominio_id: int | None = None) -> EncomendaModel | None:
        stmt = select(EncomendaModel).where(EncomendaModel.id == encomenda_id)
        if condominio_id is not None:
            stmt = stmt.where(EncomendaModel.condominio_id == condominio_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def list_all(self, condominio_id: int | None = None) -> list[EncomendaModel]:
        stmt = select(EncomendaModel).order_by(EncomendaModel.id.desc())
        if condominio_id is not None:
            stmt = stmt.where(EncomendaModel.condominio_id == condominio_id)
        return list(self.db.execute(stmt).scalars().all())

    def list_by_morador(self, morador_id: int, condominio_id: int | None = None) -> list[EncomendaModel]:
        stmt = select(EncomendaModel).where(EncomendaModel.morador_id == morador_id)
        if condominio_id is not None:
            stmt = stmt.where(EncomendaModel.condominio_id == condominio_id)
        stmt = stmt.order_by(EncomendaModel.id.desc())
        return list(self.db.execute(stmt).scalars().all())

    def entregar(self, model: EncomendaModel, entregue_por_usuario_id: int, retirado_por_nome: str) -> EncomendaModel:
        model.status = "ENTREGUE"
        model.data_entrega = datetime.utcnow()
        model.entregue_por_usuario_id = entregue_por_usuario_id
        model.retirado_por_nome = retirado_por_nome
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def reabrir(self, model: EncomendaModel, reaberto_por_usuario_id: int, motivo_reabertura: str) -> EncomendaModel:
        model.status = "DISPONIVEL_RETIRADA"
        model.motivo_reabertura = motivo_reabertura
        model.reaberto_por_usuario_id = reaberto_por_usuario_id
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model
