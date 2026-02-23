from sqlalchemy import select
from sqlalchemy.orm import Session

from src.infrastructure.database.models import ChaveSistemaModel


GLOBAL_API_KEY_NAME = "GLOBAL_API_KEY"


class ChaveSistemaRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def find_global_api_key(self) -> ChaveSistemaModel | None:
        stmt = select(ChaveSistemaModel).where(
            ChaveSistemaModel.nome == GLOBAL_API_KEY_NAME,
            ChaveSistemaModel.ativo.is_(True),
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def upsert_global_api_key(self, value: str) -> tuple[ChaveSistemaModel, bool]:
        model = self.find_global_api_key()
        created = False

        if model is None:
            created = True
            model = ChaveSistemaModel(nome=GLOBAL_API_KEY_NAME, valor=value, ativo=True)
            self.db.add(model)
        else:
            model.valor = value
            model.ativo = True

        self.db.commit()
        self.db.refresh(model)
        return model, created
