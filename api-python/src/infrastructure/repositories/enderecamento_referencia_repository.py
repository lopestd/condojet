import re
import unicodedata

from sqlalchemy import func, select
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

    def list_tipos_logradouro_horizontal(self, condominio_id: int | None) -> list[TipoLogradouroHorizontalModel]:
        if condominio_id is None:
            return []
        stmt = (
            select(TipoLogradouroHorizontalModel)
            .where(
                TipoLogradouroHorizontalModel.ativo.is_(True),
                TipoLogradouroHorizontalModel.condominio_id == condominio_id,
            )
            .order_by(TipoLogradouroHorizontalModel.ordem_exibicao.asc(), TipoLogradouroHorizontalModel.id.asc())
        )
        return list(self.db.execute(stmt).scalars().all())

    def list_subtipos_logradouro_horizontal(self, condominio_id: int | None) -> list[SubtipoLogradouroHorizontalModel]:
        if condominio_id is None:
            return []
        stmt = (
            select(SubtipoLogradouroHorizontalModel)
            .where(
                SubtipoLogradouroHorizontalModel.ativo.is_(True),
                SubtipoLogradouroHorizontalModel.condominio_id == condominio_id,
            )
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

    def find_tipo_logradouro_by_nome(self, condominio_id: int, nome: str) -> TipoLogradouroHorizontalModel | None:
        stmt = select(TipoLogradouroHorizontalModel).where(
            TipoLogradouroHorizontalModel.condominio_id == condominio_id,
            TipoLogradouroHorizontalModel.ativo.is_(True),
            func.lower(TipoLogradouroHorizontalModel.nome) == nome.strip().lower(),
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def find_subtipo_logradouro_by_nome(
        self,
        condominio_id: int,
        tipo_logradouro_horizontal_id: int,
        nome: str,
    ) -> SubtipoLogradouroHorizontalModel | None:
        stmt = select(SubtipoLogradouroHorizontalModel).where(
            SubtipoLogradouroHorizontalModel.condominio_id == condominio_id,
            SubtipoLogradouroHorizontalModel.tipo_logradouro_horizontal_id == tipo_logradouro_horizontal_id,
            SubtipoLogradouroHorizontalModel.ativo.is_(True),
            func.lower(SubtipoLogradouroHorizontalModel.nome) == nome.strip().lower(),
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def create_tipo_logradouro(self, condominio_id: int, nome: str, ordem_exibicao: int) -> TipoLogradouroHorizontalModel:
        model = TipoLogradouroHorizontalModel(
            condominio_id=condominio_id,
            nome=nome.strip(),
            slug=self._slugify(nome),
            ativo=True,
            ordem_exibicao=ordem_exibicao,
        )
        self.db.add(model)
        self.db.flush()
        return model

    def create_subtipo_logradouro(
        self,
        condominio_id: int,
        tipo_logradouro_horizontal_id: int,
        nome: str,
        ordem_exibicao: int,
    ) -> SubtipoLogradouroHorizontalModel:
        model = SubtipoLogradouroHorizontalModel(
            condominio_id=condominio_id,
            tipo_logradouro_horizontal_id=tipo_logradouro_horizontal_id,
            nome=nome.strip(),
            slug=self._slugify(nome),
            ativo=True,
            ordem_exibicao=ordem_exibicao,
        )
        self.db.add(model)
        self.db.flush()
        return model

    @staticmethod
    def _slugify(value: str) -> str:
        normalized = unicodedata.normalize("NFD", value or "")
        normalized = "".join(char for char in normalized if unicodedata.category(char) != "Mn")
        normalized = re.sub(r"[^A-Za-z0-9]+", "_", normalized).strip("_")
        return (normalized or "ITEM").upper()
