from sqlalchemy import select
from sqlalchemy.orm import Session

from src.infrastructure.database.models import ConfiguracaoModel


class ConfiguracaoRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def find_by_condominio_id(self, condominio_id: int) -> ConfiguracaoModel | None:
        stmt = select(ConfiguracaoModel).where(ConfiguracaoModel.condominio_id == condominio_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_or_create(self, condominio_id: int) -> ConfiguracaoModel:
        model = self.find_by_condominio_id(condominio_id)
        if model is not None:
            return model
        model = ConfiguracaoModel(condominio_id=condominio_id, status_conexao="DESCONECTADO")
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def upsert_operacionais(
        self,
        condominio_id: int,
        timezone: str | None = None,
        prazo_dias_encomenda_esquecida: int | None = None,
    ) -> ConfiguracaoModel:
        model = self.get_or_create(condominio_id)
        if timezone is not None:
            model.timezone = timezone
        if prazo_dias_encomenda_esquecida is not None:
            model.prazo_dias_encomenda_esquecida = prazo_dias_encomenda_esquecida
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model
