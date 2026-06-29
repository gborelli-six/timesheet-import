"""add needs_reauth to user_tokens

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-29
"""

import sqlalchemy as sa

from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_tokens",
        sa.Column("needs_reauth", sa.Boolean, nullable=False, server_default="false"),
    )


def downgrade() -> None:
    op.drop_column("user_tokens", "needs_reauth")
