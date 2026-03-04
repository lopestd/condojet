"""add notification tracking fields to encomendas

Revision ID: 20260304_0013
Revises: 20260304_0012
Create Date: 2026-03-04 00:30:00.000000
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260304_0013"
down_revision: Union[str, None] = "20260304_0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE admcondojet.encomendas
        ADD COLUMN IF NOT EXISTS notificado_em TIMESTAMPTZ NULL,
        ADD COLUMN IF NOT EXISTS notificado_por VARCHAR(80) NULL,
        ADD COLUMN IF NOT EXISTS notificacao_status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
        ADD COLUMN IF NOT EXISTS notificacao_erro TEXT NULL;

        ALTER TABLE admcondojet.encomendas
        DROP CONSTRAINT IF EXISTS ck_encomendas_notificacao_status_valido;

        ALTER TABLE admcondojet.encomendas
        ADD CONSTRAINT ck_encomendas_notificacao_status_valido
        CHECK (notificacao_status IN ('PENDENTE', 'ENVIADO', 'FALHA'));
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE admcondojet.encomendas
        DROP CONSTRAINT IF EXISTS ck_encomendas_notificacao_status_valido;

        ALTER TABLE admcondojet.encomendas
        DROP COLUMN IF EXISTS notificacao_erro,
        DROP COLUMN IF EXISTS notificacao_status,
        DROP COLUMN IF EXISTS notificado_por,
        DROP COLUMN IF EXISTS notificado_em;
        """
    )
