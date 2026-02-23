from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from src.infrastructure.config.settings import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        # Ensure schema resolution is stable in every session.
        db.execute(text(f"SET search_path TO {settings.db_schema}, public"))
        yield db
    finally:
        db.close()
