"""adiciona rotulos e hints de enderecamento na configuracao

Revision ID: 20260308_0016
Revises: 20260307_0015
Create Date: 2026-03-08 11:00:00.000000
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260308_0016"
down_revision: Union[str, None] = "20260307_0015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        SET search_path TO admcondojet, public;

        ALTER TABLE configuracoes
          ADD COLUMN IF NOT EXISTS endereco_predio_rotulo_bloco VARCHAR(80) NOT NULL DEFAULT 'Bloco',
          ADD COLUMN IF NOT EXISTS endereco_predio_rotulo_andar VARCHAR(80) NOT NULL DEFAULT 'Andar',
          ADD COLUMN IF NOT EXISTS endereco_predio_rotulo_apartamento VARCHAR(80) NOT NULL DEFAULT 'Apartamento',
          ADD COLUMN IF NOT EXISTS endereco_horizontal_rotulo_tipo VARCHAR(80) NOT NULL DEFAULT 'Tipo',
          ADD COLUMN IF NOT EXISTS endereco_horizontal_rotulo_subtipo VARCHAR(80) NOT NULL DEFAULT 'Subtipo',
          ADD COLUMN IF NOT EXISTS endereco_horizontal_rotulo_numero VARCHAR(80) NOT NULL DEFAULT 'Numero',
          ADD COLUMN IF NOT EXISTS endereco_horizontal_hint_tipo VARCHAR(255) NOT NULL DEFAULT 'Trecho, Quadra, Etapa ou Area',
          ADD COLUMN IF NOT EXISTS endereco_horizontal_hint_subtipo VARCHAR(255) NOT NULL DEFAULT 'Conjunto, Chacara, Quadra ou Area Especial';
        """
    )


def downgrade() -> None:
    op.execute(
        """
        SET search_path TO admcondojet, public;

        ALTER TABLE configuracoes
          DROP COLUMN IF EXISTS endereco_horizontal_hint_subtipo,
          DROP COLUMN IF EXISTS endereco_horizontal_hint_tipo,
          DROP COLUMN IF EXISTS endereco_horizontal_rotulo_numero,
          DROP COLUMN IF EXISTS endereco_horizontal_rotulo_subtipo,
          DROP COLUMN IF EXISTS endereco_horizontal_rotulo_tipo,
          DROP COLUMN IF EXISTS endereco_predio_rotulo_apartamento,
          DROP COLUMN IF EXISTS endereco_predio_rotulo_andar,
          DROP COLUMN IF EXISTS endereco_predio_rotulo_bloco;
        """
    )
