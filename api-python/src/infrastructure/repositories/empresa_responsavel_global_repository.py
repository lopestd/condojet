from sqlalchemy import select
from sqlalchemy.orm import Session

from src.infrastructure.database.models import EmpresaResponsavelGlobalModel


class EmpresaResponsavelGlobalRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_all(self, incluir_inativas: bool = False) -> list[EmpresaResponsavelGlobalModel]:
        stmt = select(EmpresaResponsavelGlobalModel)
        if not incluir_inativas:
            stmt = stmt.where(EmpresaResponsavelGlobalModel.ativo.is_(True))
        stmt = stmt.order_by(EmpresaResponsavelGlobalModel.nome.asc())
        return list(self.db.execute(stmt).scalars().all())

    def find_by_id(self, empresa_id: int) -> EmpresaResponsavelGlobalModel | None:
        stmt = select(EmpresaResponsavelGlobalModel).where(EmpresaResponsavelGlobalModel.id == empresa_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def find_by_nome_normalizado(self, nome_normalizado: str) -> EmpresaResponsavelGlobalModel | None:
        stmt = select(EmpresaResponsavelGlobalModel).where(
            EmpresaResponsavelGlobalModel.nome_normalizado == nome_normalizado
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def create(self, nome: str, nome_normalizado: str) -> EmpresaResponsavelGlobalModel:
        model = EmpresaResponsavelGlobalModel(nome=nome, nome_normalizado=nome_normalizado, ativo=True)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def update(self, model: EmpresaResponsavelGlobalModel, payload: dict) -> EmpresaResponsavelGlobalModel:
        for key, value in payload.items():
            setattr(model, key, value)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model
