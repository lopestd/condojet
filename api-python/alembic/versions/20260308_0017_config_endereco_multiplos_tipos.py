"""permite multiplos tipos/subtipos horizontais por condominio

Revision ID: 20260308_0017
Revises: 20260308_0016
Create Date: 2026-03-08 12:20:00.000000
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260308_0017"
down_revision: Union[str, None] = "20260308_0016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        SET search_path TO admcondojet, public;

        ALTER TABLE configuracoes
          ADD COLUMN IF NOT EXISTS endereco_horizontal_tipos_permitidos_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
          ADD COLUMN IF NOT EXISTS endereco_horizontal_subtipos_permitidos_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        SET search_path TO admcondojet, public;

        ALTER TABLE configuracoes
          DROP COLUMN IF EXISTS endereco_horizontal_subtipos_permitidos_ids,
          DROP COLUMN IF EXISTS endereco_horizontal_tipos_permitidos_ids;
        """
    )
