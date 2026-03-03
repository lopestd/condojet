"""add timezone column to configuracoes

Revision ID: 20260303_0010
Revises: 20260303_0009
Create Date: 2026-03-03 15:25:00.000000
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260303_0010"
down_revision: Union[str, None] = "20260303_0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE admcondojet.configuracoes
        ADD COLUMN IF NOT EXISTS timezone VARCHAR(64);

        UPDATE admcondojet.configuracoes
        SET timezone = 'America/Sao_Paulo'
        WHERE timezone IS NULL OR BTRIM(timezone) = '';

        ALTER TABLE admcondojet.configuracoes
        ALTER COLUMN timezone SET DEFAULT 'America/Sao_Paulo';

        ALTER TABLE admcondojet.configuracoes
        ALTER COLUMN timezone SET NOT NULL;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE admcondojet.configuracoes
        DROP COLUMN IF EXISTS timezone;
        """
    )
