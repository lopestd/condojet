from sqlalchemy import select
from sqlalchemy.orm import Session

from src.infrastructure.database.models import WebhookN8nCondominioModel


class WebhookN8nRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_by_condominio_id(self, condominio_id: int) -> list[WebhookN8nCondominioModel]:
        stmt = (
            select(WebhookN8nCondominioModel)
            .where(WebhookN8nCondominioModel.condominio_id == condominio_id)
            .order_by(WebhookN8nCondominioModel.tipo.asc())
        )
        return list(self.db.execute(stmt).scalars().all())

    def find_by_tipo(self, condominio_id: int, tipo: str) -> WebhookN8nCondominioModel | None:
        stmt = select(WebhookN8nCondominioModel).where(
            WebhookN8nCondominioModel.condominio_id == condominio_id,
            WebhookN8nCondominioModel.tipo == tipo,
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def upsert(self, condominio_id: int, tipo: str, url: str, ativo: bool, updated_by_usuario_id: int) -> WebhookN8nCondominioModel:
        model = self.find_by_tipo(condominio_id, tipo)
        if model is None:
            model = WebhookN8nCondominioModel(
                condominio_id=condominio_id,
                tipo=tipo,
                url=url,
                ativo=ativo,
                updated_by_usuario_id=updated_by_usuario_id,
            )
        else:
            model.url = url
            model.ativo = ativo
            model.updated_by_usuario_id = updated_by_usuario_id

        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model
