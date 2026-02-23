"""add telefone to usuarios admin

Revision ID: 20260222_0004
Revises: 20260222_0003
Create Date: 2026-02-22 00:40:00.000000
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260222_0004"
down_revision: Union[str, None] = "20260222_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE admcondojet.usuarios
        ADD COLUMN IF NOT EXISTS telefone VARCHAR(15);

        UPDATE admcondojet.usuarios
        SET telefone = '(00) 00000-0000'
        WHERE telefone IS NULL;

        ALTER TABLE admcondojet.usuarios
        ALTER COLUMN telefone SET NOT NULL;

        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'ck_usuario_telefone_formato'
              AND connamespace = 'admcondojet'::regnamespace
          ) THEN
            ALTER TABLE admcondojet.usuarios
            ADD CONSTRAINT ck_usuario_telefone_formato
            CHECK (telefone ~ '^\\(\\d{2}\\)\\s\\d{5}-\\d{4}$');
          END IF;
        END;
        $$;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE admcondojet.usuarios
        DROP CONSTRAINT IF EXISTS ck_usuario_telefone_formato;

        ALTER TABLE admcondojet.usuarios
        DROP COLUMN IF EXISTS telefone;
        """
    )
