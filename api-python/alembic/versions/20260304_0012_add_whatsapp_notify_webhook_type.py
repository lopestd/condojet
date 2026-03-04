"""add whatsapp notify webhook type to global constraint

Revision ID: 20260304_0012
Revises: 20260303_0011
Create Date: 2026-03-04 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260304_0012"
down_revision: Union[str, None] = "20260303_0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE admcondojet.webhooks_n8n_global
        DROP CONSTRAINT IF EXISTS ck_webhooks_n8n_global_tipo_valido;

        ALTER TABLE admcondojet.webhooks_n8n_global
        ADD CONSTRAINT ck_webhooks_n8n_global_tipo_valido
        CHECK (tipo IN ('whatsapp_create', 'whatsapp_query', 'whatsapp_notify'));
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE admcondojet.webhooks_n8n_global
        DROP CONSTRAINT IF EXISTS ck_webhooks_n8n_global_tipo_valido;

        ALTER TABLE admcondojet.webhooks_n8n_global
        ADD CONSTRAINT ck_webhooks_n8n_global_tipo_valido
        CHECK (tipo IN ('whatsapp_create', 'whatsapp_query'));
        """
    )
