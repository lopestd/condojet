from sqlalchemy.orm import Session

from src.application.services.exceptions import AppError
from src.infrastructure.config.settings import settings
from src.infrastructure.repositories.chave_sistema_repository import ChaveSistemaRepository
from src.infrastructure.repositories.email_registry_repository import EmailRegistryRepository
from src.infrastructure.repositories.usuario_global_repository import UsuarioGlobalRepository
from src.infrastructure.security.password import hash_password


def sync_global_defaults(db: Session) -> dict:
    key_repository = ChaveSistemaRepository(db)
    key_model, key_created = key_repository.upsert_global_api_key(settings.global_api_key)

    email_registry_repository = EmailRegistryRepository(db)
    owner = email_registry_repository.find_owner(settings.global_admin_email)
    if owner is not None and owner[0] != 'usuarios_globais':
        raise AppError('email_already_exists', status_code=409, code='email_already_exists')

    user_repository = UsuarioGlobalRepository(db)
    user_model, user_created = user_repository.replace_admin_global(
        nome=settings.global_admin_name,
        email=settings.global_admin_email,
        senha_hash=hash_password(settings.global_admin_password),
    )

    return {
        'api_key': {
            'id': key_model.id,
            'created': key_created,
            'nome': key_model.nome,
        },
        'global_admin': {
            'id': user_model.id,
            'created': user_created,
            'email': user_model.email,
            'perfil': user_model.perfil,
        },
    }
