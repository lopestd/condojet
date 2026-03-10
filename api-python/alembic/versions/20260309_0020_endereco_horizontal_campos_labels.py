"""Persistir labels de campos horizontais por endereco de morador

Revision ID: 20260309_0020
Revises: 20260309_0019
Create Date: 2026-03-09 14:35:00.000000
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260309_0020"
down_revision = "20260309_0019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE admcondojet.enderecos_morador
          ADD COLUMN IF NOT EXISTS tipo_logradouro_horizontal_campo_nome VARCHAR(80),
          ADD COLUMN IF NOT EXISTS subtipo_logradouro_horizontal_campo_nome VARCHAR(80);
        """
    )
    op.execute(
        """
        UPDATE admcondojet.enderecos_morador e
        SET tipo_logradouro_horizontal_campo_nome = t.nome
        FROM admcondojet.tipos_logradouro_horizontal t
        WHERE e.tipo_logradouro_horizontal_id = t.id
          AND (e.tipo_logradouro_horizontal_campo_nome IS NULL OR BTRIM(e.tipo_logradouro_horizontal_campo_nome) = '');
        """
    )
    op.execute(
        """
        UPDATE admcondojet.enderecos_morador e
        SET subtipo_logradouro_horizontal_campo_nome = s.nome
        FROM admcondojet.subtipos_logradouro_horizontal s
        WHERE e.subtipo_logradouro_horizontal_id = s.id
          AND (e.subtipo_logradouro_horizontal_campo_nome IS NULL OR BTRIM(e.subtipo_logradouro_horizontal_campo_nome) = '');
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE admcondojet.enderecos_morador
          DROP COLUMN IF EXISTS subtipo_logradouro_horizontal_campo_nome,
          DROP COLUMN IF EXISTS tipo_logradouro_horizontal_campo_nome;
        """
    )
