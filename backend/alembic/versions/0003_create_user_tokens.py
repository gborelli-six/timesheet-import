"""create user_tokens table

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-29
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None

_service_enum = pg.ENUM(
    "jira",
    "odoo",
    "linear",
    "asana",
    name="user_tokens_service_enum",
    create_type=False,
)


def upgrade() -> None:
    _service_enum.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "user_tokens",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("service", _service_enum, nullable=False),
        sa.Column("label", sa.String(255), nullable=False),
        sa.Column("base_url", sa.String(512), nullable=True),
        sa.Column("account_identifier", sa.String(255), nullable=True),
        sa.Column("secret_enc", sa.LargeBinary, nullable=False),
        sa.Column("nonce", sa.LargeBinary(12), nullable=False),
        sa.Column(
            "key_version",
            sa.SmallInteger,
            nullable=False,
            server_default="1",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("user_id", "label", name="uq_user_tokens_user_id_label"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_user_tokens_user_id_users",
            ondelete="CASCADE",
        ),
    )


def downgrade() -> None:
    op.drop_table("user_tokens")
    _service_enum.drop(op.get_bind(), checkfirst=True)
