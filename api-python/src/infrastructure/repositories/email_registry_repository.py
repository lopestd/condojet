from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.infrastructure.database.models import MoradorModel, UsuarioGlobalModel, UsuarioModel


class EmailRegistryRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def find_owner(self, email: str) -> tuple[str, int] | None:
        normalized = email.strip().lower()

        usuario = self.db.execute(
            select(UsuarioModel.id).where(func.lower(UsuarioModel.email) == normalized).limit(1)
        ).scalar_one_or_none()
        if usuario is not None:
            return ("usuarios", int(usuario))

        morador = self.db.execute(
            select(MoradorModel.id).where(func.lower(MoradorModel.email) == normalized).limit(1)
        ).scalar_one_or_none()
        if morador is not None:
            return ("moradores", int(morador))

        global_user = self.db.execute(
            select(UsuarioGlobalModel.id).where(func.lower(UsuarioGlobalModel.email) == normalized).limit(1)
        ).scalar_one_or_none()
        if global_user is not None:
            return ("usuarios_globais", int(global_user))

        return None

