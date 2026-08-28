"""Add contact email to personas for staff patient registration."""

from alembic import op
import sqlalchemy as sa

revision = "20260828_11"
down_revision = "20260828_b08_mfa"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("personas", sa.Column("email", sa.String(length=255), nullable=True))
    op.create_index("ix_personas_email", "personas", ["email"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_personas_email", table_name="personas")
    op.drop_column("personas", "email")
