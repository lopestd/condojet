"""enderecamento livre por texto

Revision ID: 20260309_0018
Revises: 20260308_0017
Create Date: 2026-03-09 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260309_0018"
down_revision: Union[str, None] = "20260308_0017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        SET search_path TO admcondojet, public;

        ALTER TABLE configuracoes
          ADD COLUMN IF NOT EXISTS endereco_horizontal_tipos_permitidos_nomes JSONB NOT NULL DEFAULT '[]'::jsonb,
          ADD COLUMN IF NOT EXISTS endereco_horizontal_subtipos_permitidos_nomes JSONB NOT NULL DEFAULT '[]'::jsonb;

        ALTER TABLE enderecos_morador
          ADD COLUMN IF NOT EXISTS tipo_logradouro_horizontal_nome_livre VARCHAR(80),
          ADD COLUMN IF NOT EXISTS subtipo_logradouro_horizontal_nome_livre VARCHAR(80);
        """
    )


def downgrade() -> None:
    op.execute(
        """
        SET search_path TO admcondojet, public;

        ALTER TABLE enderecos_morador
          DROP COLUMN IF EXISTS subtipo_logradouro_horizontal_nome_livre,
          DROP COLUMN IF EXISTS tipo_logradouro_horizontal_nome_livre;

        ALTER TABLE configuracoes
          DROP COLUMN IF EXISTS endereco_horizontal_subtipos_permitidos_nomes,
          DROP COLUMN IF EXISTS endereco_horizontal_tipos_permitidos_nomes;
        """
    )

