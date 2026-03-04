from sqlalchemy import select
from sqlalchemy.orm import Session

from src.infrastructure.database.models import WebhookN8nGlobalModel


class WebhookN8nRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_all(self) -> list[WebhookN8nGlobalModel]:
        stmt = select(WebhookN8nGlobalModel).order_by(WebhookN8nGlobalModel.tipo.asc())
        return list(self.db.execute(stmt).scalars().all())

    def find_by_tipo(self, tipo: str) -> WebhookN8nGlobalModel | None:
        stmt = select(WebhookN8nGlobalModel).where(WebhookN8nGlobalModel.tipo == tipo)
        return self.db.execute(stmt).scalar_one_or_none()

    def upsert(self, tipo: str, url: str, ativo: bool, updated_by_usuario_id: int) -> WebhookN8nGlobalModel:
        model = self.find_by_tipo(tipo)
        if model is None:
            model = WebhookN8nGlobalModel(
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
