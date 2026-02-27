from datetime import datetime

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from src.infrastructure.database.models import EncomendaModel, EnderecoModel, MoradorModel


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

    def list_all_with_details(self, condominio_id: int) -> list[tuple[EncomendaModel, str | None, EnderecoModel | None]]:
        stmt = (
            select(EncomendaModel, MoradorModel.nome, EnderecoModel)
            .outerjoin(
                MoradorModel,
                and_(
                    MoradorModel.id == EncomendaModel.morador_id,
                    MoradorModel.condominio_id == EncomendaModel.condominio_id,
                ),
            )
            .outerjoin(
                EnderecoModel,
                and_(
                    EnderecoModel.id == EncomendaModel.endereco_id,
                    EnderecoModel.condominio_id == EncomendaModel.condominio_id,
                ),
            )
            .where(EncomendaModel.condominio_id == condominio_id)
            .order_by(EncomendaModel.id.desc())
        )
        return list(self.db.execute(stmt).all())

    def list_by_morador(self, morador_id: int, condominio_id: int | None = None) -> list[EncomendaModel]:
        stmt = select(EncomendaModel).where(EncomendaModel.morador_id == morador_id)
        if condominio_id is not None:
            stmt = stmt.where(EncomendaModel.condominio_id == condominio_id)
        stmt = stmt.order_by(EncomendaModel.id.desc())
        return list(self.db.execute(stmt).scalars().all())

    def find_by_id_with_details(
        self, encomenda_id: int, condominio_id: int
    ) -> tuple[EncomendaModel, str | None, EnderecoModel | None] | None:
        stmt = (
            select(EncomendaModel, MoradorModel.nome, EnderecoModel)
            .outerjoin(
                MoradorModel,
                and_(
                    MoradorModel.id == EncomendaModel.morador_id,
                    MoradorModel.condominio_id == EncomendaModel.condominio_id,
                ),
            )
            .outerjoin(
                EnderecoModel,
                and_(
                    EnderecoModel.id == EncomendaModel.endereco_id,
                    EnderecoModel.condominio_id == EncomendaModel.condominio_id,
                ),
            )
            .where(EncomendaModel.id == encomenda_id, EncomendaModel.condominio_id == condominio_id)
        )
        return self.db.execute(stmt).one_or_none()

    def update(self, model: EncomendaModel, payload: dict) -> EncomendaModel:
        for key, value in payload.items():
            setattr(model, key, value)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

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

    def delete(self, model: EncomendaModel) -> None:
        self.db.delete(model)
        self.db.commit()
