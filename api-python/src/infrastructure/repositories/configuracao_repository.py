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

    def upsert_parametros_enderecamento(
        self,
        condominio_id: int,
        *,
        predio_rotulo_bloco: str,
        predio_rotulo_andar: str,
        predio_rotulo_apartamento: str,
        horizontal_rotulo_tipo: str,
        horizontal_rotulo_subtipo: str,
        horizontal_rotulo_numero: str,
        horizontal_hint_tipo: str,
        horizontal_hint_subtipo: str,
        horizontal_tipos_permitidos_ids: list[int],
        horizontal_subtipos_permitidos_ids: list[int],
        horizontal_tipos_permitidos_nomes: list[str],
        horizontal_subtipos_permitidos_nomes: list[str],
    ) -> ConfiguracaoModel:
        model = self.get_or_create(condominio_id)
        model.endereco_predio_rotulo_bloco = predio_rotulo_bloco
        model.endereco_predio_rotulo_andar = predio_rotulo_andar
        model.endereco_predio_rotulo_apartamento = predio_rotulo_apartamento
        model.endereco_horizontal_rotulo_tipo = horizontal_rotulo_tipo
        model.endereco_horizontal_rotulo_subtipo = horizontal_rotulo_subtipo
        model.endereco_horizontal_rotulo_numero = horizontal_rotulo_numero
        model.endereco_horizontal_hint_tipo = horizontal_hint_tipo
        model.endereco_horizontal_hint_subtipo = horizontal_hint_subtipo
        model.endereco_horizontal_tipos_permitidos_ids = horizontal_tipos_permitidos_ids
        model.endereco_horizontal_subtipos_permitidos_ids = horizontal_subtipos_permitidos_ids
        model.endereco_horizontal_tipos_permitidos_nomes = horizontal_tipos_permitidos_nomes
        model.endereco_horizontal_subtipos_permitidos_nomes = horizontal_subtipos_permitidos_nomes
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model
