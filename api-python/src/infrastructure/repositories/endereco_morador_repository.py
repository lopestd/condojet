from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from src.infrastructure.database.models import (
    EnderecoMoradorModel,
    SubtipoLogradouroHorizontalModel,
    TipoLogradouroHorizontalModel,
)


class EnderecoMoradorRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_all_with_refs(
        self, condominio_id: int
    ) -> list[tuple[EnderecoMoradorModel, TipoLogradouroHorizontalModel | None, SubtipoLogradouroHorizontalModel | None]]:
        stmt = (
            select(EnderecoMoradorModel, TipoLogradouroHorizontalModel, SubtipoLogradouroHorizontalModel)
            .outerjoin(
                TipoLogradouroHorizontalModel,
                TipoLogradouroHorizontalModel.id == EnderecoMoradorModel.tipo_logradouro_horizontal_id,
            )
            .outerjoin(
                SubtipoLogradouroHorizontalModel,
                SubtipoLogradouroHorizontalModel.id == EnderecoMoradorModel.subtipo_logradouro_horizontal_id,
            )
            .where(EnderecoMoradorModel.condominio_id == condominio_id)
            .order_by(EnderecoMoradorModel.id.desc())
        )
        return list(self.db.execute(stmt).all())

    def create(self, payload: dict) -> EnderecoMoradorModel:
        model = EnderecoMoradorModel(**payload)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def find_by_id(self, endereco_id: int, condominio_id: int) -> EnderecoMoradorModel | None:
        stmt = select(EnderecoMoradorModel).where(
            EnderecoMoradorModel.id == endereco_id,
            EnderecoMoradorModel.condominio_id == condominio_id,
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def find_tipo_logradouro_by_id(self, tipo_logradouro_id: int) -> TipoLogradouroHorizontalModel | None:
        stmt = select(TipoLogradouroHorizontalModel).where(
            TipoLogradouroHorizontalModel.id == tipo_logradouro_id,
            TipoLogradouroHorizontalModel.ativo.is_(True),
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def find_subtipo_logradouro_by_id(self, subtipo_logradouro_id: int) -> SubtipoLogradouroHorizontalModel | None:
        stmt = select(SubtipoLogradouroHorizontalModel).where(
            SubtipoLogradouroHorizontalModel.id == subtipo_logradouro_id,
            SubtipoLogradouroHorizontalModel.ativo.is_(True),
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def find_by_predio_fields(
        self, condominio_id: int, bloco: str, andar: str, apartamento: str
    ) -> EnderecoMoradorModel | None:
        stmt = select(EnderecoMoradorModel).where(
            EnderecoMoradorModel.condominio_id == condominio_id,
            EnderecoMoradorModel.bloco == bloco,
            EnderecoMoradorModel.andar == andar,
            EnderecoMoradorModel.apartamento == apartamento,
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def find_by_horizontal_fields(
        self,
        condominio_id: int,
        tipo_logradouro_horizontal_id: int,
        subtipo_logradouro_horizontal_id: int,
        numero: str,
    ) -> EnderecoMoradorModel | None:
        stmt = select(EnderecoMoradorModel).where(
            EnderecoMoradorModel.condominio_id == condominio_id,
            EnderecoMoradorModel.tipo_logradouro_horizontal_id == tipo_logradouro_horizontal_id,
            EnderecoMoradorModel.subtipo_logradouro_horizontal_id == subtipo_logradouro_horizontal_id,
            EnderecoMoradorModel.numero == numero,
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def find_by_id_with_refs(
        self, endereco_id: int, condominio_id: int
    ) -> tuple[EnderecoMoradorModel, TipoLogradouroHorizontalModel | None, SubtipoLogradouroHorizontalModel | None] | None:
        stmt = (
            select(EnderecoMoradorModel, TipoLogradouroHorizontalModel, SubtipoLogradouroHorizontalModel)
            .outerjoin(
                TipoLogradouroHorizontalModel,
                TipoLogradouroHorizontalModel.id == EnderecoMoradorModel.tipo_logradouro_horizontal_id,
            )
            .outerjoin(
                SubtipoLogradouroHorizontalModel,
                SubtipoLogradouroHorizontalModel.id == EnderecoMoradorModel.subtipo_logradouro_horizontal_id,
            )
            .where(
                and_(
                    EnderecoMoradorModel.id == endereco_id,
                    EnderecoMoradorModel.condominio_id == condominio_id,
                )
            )
        )
        return self.db.execute(stmt).one_or_none()
