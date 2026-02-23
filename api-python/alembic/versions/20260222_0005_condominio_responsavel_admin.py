"""add responsavel_sistema to usuarios

Revision ID: 20260222_0005
Revises: 20260222_0004
Create Date: 2026-02-22 01:20:00.000000
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260222_0005"
down_revision: Union[str, None] = "20260222_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE admcondojet.usuarios
        ADD COLUMN IF NOT EXISTS responsavel_sistema BOOLEAN;

        UPDATE admcondojet.usuarios
        SET responsavel_sistema = FALSE
        WHERE responsavel_sistema IS NULL;

        WITH ranked AS (
          SELECT id,
                 ROW_NUMBER() OVER (PARTITION BY condominio_id ORDER BY ativo DESC, id ASC) AS rn
          FROM admcondojet.usuarios
          WHERE perfil = 'ADMIN'
        )
        UPDATE admcondojet.usuarios u
        SET responsavel_sistema = (ranked.rn = 1)
        FROM ranked
        WHERE u.id = ranked.id;

        ALTER TABLE admcondojet.usuarios
        ALTER COLUMN responsavel_sistema SET NOT NULL;

        ALTER TABLE admcondojet.usuarios
        ALTER COLUMN responsavel_sistema SET DEFAULT FALSE;

        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'ck_usuario_responsavel_apenas_admin'
              AND connamespace = 'admcondojet'::regnamespace
          ) THEN
            ALTER TABLE admcondojet.usuarios
            ADD CONSTRAINT ck_usuario_responsavel_apenas_admin
            CHECK (perfil = 'ADMIN' OR responsavel_sistema = FALSE);
          END IF;
        END;
        $$;

        CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_responsavel_por_condominio
          ON admcondojet.usuarios (condominio_id) WHERE responsavel_sistema = TRUE;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP INDEX IF EXISTS admcondojet.ux_usuarios_responsavel_por_condominio;
        ALTER TABLE admcondojet.usuarios
        DROP CONSTRAINT IF EXISTS ck_usuario_responsavel_apenas_admin;
        ALTER TABLE admcondojet.usuarios
        DROP COLUMN IF EXISTS responsavel_sistema;
        """
    )
