"""vincula moradores ao novo modelo enderecos_morador

Revision ID: 20260307_0015
Revises: 20260307_0014
Create Date: 2026-03-07 23:15:00.000000
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260307_0015"
down_revision: Union[str, None] = "20260307_0014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        SET search_path TO admcondojet, public;

        ALTER TABLE moradores
          DROP CONSTRAINT IF EXISTS fk_morador_endereco_condominio;

        ALTER TABLE moradores
          DROP CONSTRAINT IF EXISTS fk_morador_endereco_morador_condominio;

        ALTER TABLE moradores
          ADD CONSTRAINT fk_morador_endereco_morador_condominio
          FOREIGN KEY (endereco_id, condominio_id)
          REFERENCES enderecos_morador(id, condominio_id)
          ON UPDATE RESTRICT ON DELETE RESTRICT;

        ALTER TABLE enderecos_morador
          DROP CONSTRAINT IF EXISTS ck_enderecos_morador_tipo_campos_predio;

        ALTER TABLE enderecos_morador
          ADD CONSTRAINT ck_enderecos_morador_tipo_campos_predio CHECK (
            tipo_condominio_id <> 2
            OR (
              bloco IS NOT NULL
              AND andar IS NOT NULL
              AND apartamento IS NOT NULL
              AND tipo_logradouro_horizontal_id IS NULL
              AND subtipo_logradouro_horizontal_id IS NULL
              AND numero IS NULL
            )
          );

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

        CREATE UNIQUE INDEX IF NOT EXISTS ux_enderecos_morador_predio
          ON enderecos_morador (condominio_id, bloco, andar, apartamento)
          WHERE tipo_condominio_id = 2;

        CREATE UNIQUE INDEX IF NOT EXISTS ux_enderecos_morador_horizontal
          ON enderecos_morador (condominio_id, tipo_logradouro_horizontal_id, subtipo_logradouro_horizontal_id, numero)
          WHERE tipo_condominio_id = 1;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        SET search_path TO admcondojet, public;

        DROP INDEX IF EXISTS ux_enderecos_morador_horizontal;
        DROP INDEX IF EXISTS ux_enderecos_morador_predio;

        ALTER TABLE enderecos_morador
          DROP CONSTRAINT IF EXISTS ck_enderecos_morador_tipo_campos_horizontal;

        ALTER TABLE enderecos_morador
          DROP CONSTRAINT IF EXISTS ck_enderecos_morador_tipo_campos_predio;

        ALTER TABLE moradores
          DROP CONSTRAINT IF EXISTS fk_morador_endereco_morador_condominio;

        ALTER TABLE moradores
          ADD CONSTRAINT fk_morador_endereco_condominio
          FOREIGN KEY (endereco_id, condominio_id)
          REFERENCES enderecos(id, condominio_id)
          ON UPDATE RESTRICT ON DELETE RESTRICT;
        """
    )
