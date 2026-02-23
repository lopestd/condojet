from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from src.infrastructure.database.models import UsuarioGlobalModel


class UsuarioGlobalRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def find_by_email(self, email: str) -> UsuarioGlobalModel | None:
        stmt = (
            select(UsuarioGlobalModel)
            .where(or_(UsuarioGlobalModel.email == email, UsuarioGlobalModel.email.ilike(email)))
            .order_by(UsuarioGlobalModel.id.desc())
        )
        return self.db.execute(stmt).scalars().first()

    def upsert_admin_global(self, nome: str, email: str, senha_hash: str) -> tuple[UsuarioGlobalModel, bool]:
        model = self.find_by_email(email)
        created = False
        if model is None:
            model = UsuarioGlobalModel(
                nome=nome,
                email=email,
                senha_hash=senha_hash,
                perfil="ADMIN_GLOBAL",
                ativo=True,
            )
            self.db.add(model)
            created = True
        else:
            model.nome = nome
            model.senha_hash = senha_hash
            model.perfil = "ADMIN_GLOBAL"
            model.ativo = True
            self.db.add(model)

        self.db.commit()
        self.db.refresh(model)
        return model, created
