from sqlalchemy import select
from sqlalchemy.orm import Session

from src.infrastructure.database.models import (
    SubtipoLogradouroHorizontalModel,
    TipoCondominioModel,
    TipoLogradouroHorizontalModel,
)


class EnderecamentoReferenciaRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_tipos_condominio(self) -> list[TipoCondominioModel]:
        stmt = select(TipoCondominioModel).where(TipoCondominioModel.ativo.is_(True)).order_by(TipoCondominioModel.id.asc())
        return list(self.db.execute(stmt).scalars().all())

    def list_tipos_logradouro_horizontal(self) -> list[TipoLogradouroHorizontalModel]:
        stmt = (
            select(TipoLogradouroHorizontalModel)
            .where(TipoLogradouroHorizontalModel.ativo.is_(True))
            .order_by(TipoLogradouroHorizontalModel.ordem_exibicao.asc(), TipoLogradouroHorizontalModel.id.asc())
        )
        return list(self.db.execute(stmt).scalars().all())

    def list_subtipos_logradouro_horizontal(self) -> list[SubtipoLogradouroHorizontalModel]:
        stmt = (
            select(SubtipoLogradouroHorizontalModel)
            .where(SubtipoLogradouroHorizontalModel.ativo.is_(True))
            .order_by(
                SubtipoLogradouroHorizontalModel.tipo_logradouro_horizontal_id.asc(),
                SubtipoLogradouroHorizontalModel.ordem_exibicao.asc(),
                SubtipoLogradouroHorizontalModel.id.asc(),
            )
        )
        return list(self.db.execute(stmt).scalars().all())

    def find_tipo_condominio_by_id(self, tipo_condominio_id: int) -> TipoCondominioModel | None:
        stmt = select(TipoCondominioModel).where(
            TipoCondominioModel.id == tipo_condominio_id,
            TipoCondominioModel.ativo.is_(True),
        )
        return self.db.execute(stmt).scalar_one_or_none()
