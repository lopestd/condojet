"""enforce global unique emails across auth accounts

Revision ID: 20260224_0006
Revises: 20260222_0005
Create Date: 2026-02-24 02:00:00.000000
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260224_0006"
down_revision: Union[str, None] = "20260222_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        SET search_path TO admcondojet, public;

        DO $$
        DECLARE
          duplicate_email TEXT;
        BEGIN
          SELECT email
            INTO duplicate_email
            FROM (
              SELECT lower(email) AS email FROM usuarios
              UNION ALL
              SELECT lower(email) AS email FROM moradores
              UNION ALL
              SELECT lower(email) AS email FROM usuarios_globais
            ) all_emails
           GROUP BY email
          HAVING COUNT(*) > 1
           LIMIT 1;

          IF duplicate_email IS NOT NULL THEN
            RAISE EXCEPTION 'email_global_duplicate_found: %', duplicate_email;
          END IF;
        END;
        $$;

        CREATE OR REPLACE FUNCTION fn_assert_email_unique_global(
          p_email TEXT,
          p_origin TEXT,
          p_origin_id BIGINT
        ) RETURNS VOID AS $$
        BEGIN
          IF p_email IS NULL OR BTRIM(p_email) = '' THEN
            RETURN;
          END IF;

          IF EXISTS (
            SELECT 1
              FROM usuarios u
             WHERE lower(u.email) = lower(p_email)
               AND NOT (p_origin = 'usuarios' AND p_origin_id IS NOT NULL AND u.id = p_origin_id)
            UNION ALL
            SELECT 1
              FROM moradores m
             WHERE lower(m.email) = lower(p_email)
               AND NOT (p_origin = 'moradores' AND p_origin_id IS NOT NULL AND m.id = p_origin_id)
            UNION ALL
            SELECT 1
              FROM usuarios_globais g
             WHERE lower(g.email) = lower(p_email)
               AND NOT (p_origin = 'usuarios_globais' AND p_origin_id IS NOT NULL AND g.id = p_origin_id)
          ) THEN
            RAISE EXCEPTION 'email_already_exists' USING ERRCODE = '23505';
          END IF;
        END;
        $$ LANGUAGE plpgsql;

        CREATE OR REPLACE FUNCTION fn_trg_usuarios_email_unique_global() RETURNS TRIGGER AS $$
        BEGIN
          PERFORM fn_assert_email_unique_global(NEW.email, 'usuarios', NEW.id);
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE OR REPLACE FUNCTION fn_trg_moradores_email_unique_global() RETURNS TRIGGER AS $$
        BEGIN
          PERFORM fn_assert_email_unique_global(NEW.email, 'moradores', NEW.id);
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE OR REPLACE FUNCTION fn_trg_usuarios_globais_email_unique_global() RETURNS TRIGGER AS $$
        BEGIN
          PERFORM fn_assert_email_unique_global(NEW.email, 'usuarios_globais', NEW.id);
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trg_usuarios_email_unique_global ON usuarios;
        CREATE TRIGGER trg_usuarios_email_unique_global
          BEFORE INSERT OR UPDATE OF email ON usuarios
          FOR EACH ROW
          EXECUTE FUNCTION fn_trg_usuarios_email_unique_global();

        DROP TRIGGER IF EXISTS trg_moradores_email_unique_global ON moradores;
        CREATE TRIGGER trg_moradores_email_unique_global
          BEFORE INSERT OR UPDATE OF email ON moradores
          FOR EACH ROW
          EXECUTE FUNCTION fn_trg_moradores_email_unique_global();

        DROP TRIGGER IF EXISTS trg_usuarios_globais_email_unique_global ON usuarios_globais;
        CREATE TRIGGER trg_usuarios_globais_email_unique_global
          BEFORE INSERT OR UPDATE OF email ON usuarios_globais
          FOR EACH ROW
          EXECUTE FUNCTION fn_trg_usuarios_globais_email_unique_global();
        """
    )


def downgrade() -> None:
    op.execute(
        """
        SET search_path TO admcondojet, public;

        DROP TRIGGER IF EXISTS trg_usuarios_email_unique_global ON usuarios;
        DROP TRIGGER IF EXISTS trg_moradores_email_unique_global ON moradores;
        DROP TRIGGER IF EXISTS trg_usuarios_globais_email_unique_global ON usuarios_globais;

        DROP FUNCTION IF EXISTS fn_trg_usuarios_email_unique_global();
        DROP FUNCTION IF EXISTS fn_trg_moradores_email_unique_global();
        DROP FUNCTION IF EXISTS fn_trg_usuarios_globais_email_unique_global();
        DROP FUNCTION IF EXISTS fn_assert_email_unique_global(TEXT, TEXT, BIGINT);
        """
    )

