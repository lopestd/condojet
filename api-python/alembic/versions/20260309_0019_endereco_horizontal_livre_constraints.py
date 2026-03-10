"""ajusta constraints endereco horizontal para modo livre

Revision ID: 20260309_0019
Revises: 20260309_0018
Create Date: 2026-03-09 00:30:00.000000
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260309_0019"
down_revision: Union[str, None] = "20260309_0018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        SET search_path TO admcondojet, public;

        ALTER TABLE enderecos_morador
          DROP CONSTRAINT IF EXISTS ck_enderecos_morador_tipo_campos_horizontal;

        ALTER TABLE enderecos_morador
          ADD CONSTRAINT ck_enderecos_morador_tipo_campos_horizontal CHECK (
            tipo_condominio_id <> 1
            OR (
              bloco IS NULL
              AND andar IS NULL
              AND apartamento IS NULL
              AND numero IS NOT NULL
              AND (
                (
                  tipo_logradouro_horizontal_id IS NOT NULL
                  AND subtipo_logradouro_horizontal_id IS NOT NULL
                )
                OR (
                  tipo_logradouro_horizontal_id IS NULL
                  AND subtipo_logradouro_horizontal_id IS NULL
                  AND BTRIM(COALESCE(tipo_logradouro_horizontal_nome_livre, '')) <> ''
                  AND BTRIM(COALESCE(subtipo_logradouro_horizontal_nome_livre, '')) <> ''
                )
              )
            )
          );

        DROP INDEX IF EXISTS ux_enderecos_morador_horizontal;

        CREATE UNIQUE INDEX IF NOT EXISTS ux_enderecos_morador_horizontal_ids
          ON enderecos_morador (condominio_id, tipo_logradouro_horizontal_id, subtipo_logradouro_horizontal_id, numero)
          WHERE tipo_condominio_id = 1
            AND tipo_logradouro_horizontal_id IS NOT NULL
            AND subtipo_logradouro_horizontal_id IS NOT NULL;

        CREATE UNIQUE INDEX IF NOT EXISTS ux_enderecos_morador_horizontal_livre
          ON enderecos_morador (condominio_id, tipo_logradouro_horizontal_nome_livre, subtipo_logradouro_horizontal_nome_livre, numero)
          WHERE tipo_condominio_id = 1
            AND tipo_logradouro_horizontal_id IS NULL
            AND subtipo_logradouro_horizontal_id IS NULL;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        SET search_path TO admcondojet, public;

        DROP INDEX IF EXISTS ux_enderecos_morador_horizontal_livre;
        DROP INDEX IF EXISTS ux_enderecos_morador_horizontal_ids;

        ALTER TABLE enderecos_morador
          DROP CONSTRAINT IF EXISTS ck_enderecos_morador_tipo_campos_horizontal;

        ALTER TABLE enderecos_morador
          ADD CONSTRAINT ck_enderecos_morador_tipo_campos_horizontal CHECK (
            tipo_condominio_id <> 1
            OR (
              bloco IS NULL
              AND andar IS NULL
              AND apartamento IS NULL
              AND tipo_logradouro_horizontal_id IS NOT NULL
              AND subtipo_logradouro_horizontal_id IS NOT NULL
              AND numero IS NOT NULL
            )
          );

        CREATE UNIQUE INDEX IF NOT EXISTS ux_enderecos_morador_horizontal
          ON enderecos_morador (condominio_id, tipo_logradouro_horizontal_id, subtipo_logradouro_horizontal_id, numero)
          WHERE tipo_condominio_id = 1;
        """
    )

