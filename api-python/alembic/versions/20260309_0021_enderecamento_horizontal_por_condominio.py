"""enderecamento horizontal por condominio

Revision ID: 20260309_0021
Revises: 20260309_0020
Create Date: 2026-03-09 18:15:00.000000
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260309_0021"
down_revision = "20260309_0020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE admcondojet.tipos_logradouro_horizontal
          ADD COLUMN IF NOT EXISTS condominio_id BIGINT
            REFERENCES admcondojet.condominios(id) ON UPDATE RESTRICT ON DELETE RESTRICT;

        ALTER TABLE admcondojet.subtipos_logradouro_horizontal
          ADD COLUMN IF NOT EXISTS condominio_id BIGINT
            REFERENCES admcondojet.condominios(id) ON UPDATE RESTRICT ON DELETE RESTRICT;

        ALTER TABLE admcondojet.tipos_logradouro_horizontal
          DROP CONSTRAINT IF EXISTS uq_tipos_logradouro_horizontal_nome;
        ALTER TABLE admcondojet.tipos_logradouro_horizontal
          DROP CONSTRAINT IF EXISTS uq_tipos_logradouro_horizontal_slug;

        CREATE UNIQUE INDEX IF NOT EXISTS uq_tipos_logradouro_horizontal_condominio_nome
          ON admcondojet.tipos_logradouro_horizontal (condominio_id, LOWER(nome));
        CREATE UNIQUE INDEX IF NOT EXISTS uq_tipos_logradouro_horizontal_condominio_slug
          ON admcondojet.tipos_logradouro_horizontal (condominio_id, LOWER(slug));

        CREATE INDEX IF NOT EXISTS idx_tipos_logradouro_horizontal_condominio
          ON admcondojet.tipos_logradouro_horizontal (condominio_id);
        CREATE INDEX IF NOT EXISTS idx_subtipos_logradouro_horizontal_condominio
          ON admcondojet.subtipos_logradouro_horizontal (condominio_id);
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP INDEX IF EXISTS admcondojet.idx_subtipos_logradouro_horizontal_condominio;
        DROP INDEX IF EXISTS admcondojet.idx_tipos_logradouro_horizontal_condominio;
        DROP INDEX IF EXISTS admcondojet.uq_tipos_logradouro_horizontal_condominio_slug;
        DROP INDEX IF EXISTS admcondojet.uq_tipos_logradouro_horizontal_condominio_nome;

        ALTER TABLE admcondojet.tipos_logradouro_horizontal
          ADD CONSTRAINT uq_tipos_logradouro_horizontal_nome UNIQUE (nome);
        ALTER TABLE admcondojet.tipos_logradouro_horizontal
          ADD CONSTRAINT uq_tipos_logradouro_horizontal_slug UNIQUE (slug);

        ALTER TABLE admcondojet.subtipos_logradouro_horizontal
          DROP COLUMN IF EXISTS condominio_id;
        ALTER TABLE admcondojet.tipos_logradouro_horizontal
          DROP COLUMN IF EXISTS condominio_id;
        """
    )
