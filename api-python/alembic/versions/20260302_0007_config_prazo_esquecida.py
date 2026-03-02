"""add forgotten package threshold to configuracoes

Revision ID: 20260302_0007
Revises: 20260224_0006
Create Date: 2026-03-02 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260302_0007"
down_revision: Union[str, None] = "20260224_0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE admcondojet.configuracoes
        ADD COLUMN IF NOT EXISTS prazo_dias_encomenda_esquecida BIGINT;

        UPDATE admcondojet.configuracoes
        SET prazo_dias_encomenda_esquecida = 15
        WHERE prazo_dias_encomenda_esquecida IS NULL;

        ALTER TABLE admcondojet.configuracoes
        ALTER COLUMN prazo_dias_encomenda_esquecida SET NOT NULL;

        ALTER TABLE admcondojet.configuracoes
        ALTER COLUMN prazo_dias_encomenda_esquecida SET DEFAULT 15;

        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'ck_configuracoes_prazo_esquecida_valido'
              AND connamespace = 'admcondojet'::regnamespace
          ) THEN
            ALTER TABLE admcondojet.configuracoes
            ADD CONSTRAINT ck_configuracoes_prazo_esquecida_valido
            CHECK (prazo_dias_encomenda_esquecida >= 1);
          END IF;
        END;
        $$;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE admcondojet.configuracoes
        DROP CONSTRAINT IF EXISTS ck_configuracoes_prazo_esquecida_valido;

        ALTER TABLE admcondojet.configuracoes
        DROP COLUMN IF EXISTS prazo_dias_encomenda_esquecida;
        """
    )
