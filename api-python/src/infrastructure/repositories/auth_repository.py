from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from src.infrastructure.database.models import CondominioModel, MoradorModel, UsuarioGlobalModel, UsuarioModel


class AuthRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def find_account_by_email(
        self, email: str, condominio_id: int | None = None, include_global: bool = False
    ) -> tuple[int, str, str, int | None] | None:
        if include_global:
            global_stmt = (
                select(UsuarioGlobalModel)
                .where(or_(UsuarioGlobalModel.email == email, UsuarioGlobalModel.email.ilike(email)))
                .order_by(UsuarioGlobalModel.id.desc())
            )
            global_user = self.db.execute(global_stmt).scalars().first()
            if global_user is not None and global_user.ativo:
                return global_user.id, global_user.senha_hash, global_user.perfil, None

        user_stmt = (
            select(UsuarioModel)
            .where(or_(UsuarioModel.email == email, UsuarioModel.email.ilike(email)))
            .order_by(UsuarioModel.id.desc())
        )
        if condominio_id is not None:
            user_stmt = user_stmt.where(UsuarioModel.condominio_id == condominio_id)
        user = self.db.execute(user_stmt).scalars().first()
        if user is not None and user.ativo:
            return user.id, user.senha_hash, user.perfil, user.condominio_id

        morador_stmt = (
            select(MoradorModel)
            .where(or_(MoradorModel.email == email, MoradorModel.email.ilike(email)))
            .order_by(MoradorModel.id.desc())
        )
        if condominio_id is not None:
            morador_stmt = morador_stmt.where(MoradorModel.condominio_id == condominio_id)
        morador = self.db.execute(morador_stmt).scalars().first()
        if morador is not None and morador.ativo:
            return morador.id, morador.senha_hash, "MORADOR", morador.condominio_id

        return None

    def find_session_profile(self, user_id: int, role: str, condominio_id: int | None) -> tuple[str, str, str]:
        if role == "ADMIN_GLOBAL":
            global_user = self.db.get(UsuarioGlobalModel, user_id)
            if global_user is None:
                return "Usuario", "", "CondoJET Global"
            return global_user.nome, global_user.email, "CondoJET Global"

        if role == "MORADOR":
            morador = self.db.get(MoradorModel, user_id)
            nome_usuario = morador.nome if morador is not None else "Morador"
            email = morador.email if morador is not None else ""
        else:
            usuario = self.db.get(UsuarioModel, user_id)
            nome_usuario = usuario.nome if usuario is not None else "Usuario"
            email = usuario.email if usuario is not None else ""

        if condominio_id is None:
            return nome_usuario, email, "CondoJET Global"

        condominio = self.db.get(CondominioModel, condominio_id)
        nome_condominio = condominio.nome if condominio is not None else f"Condominio {condominio_id}"
        return nome_usuario, email, nome_condominio
