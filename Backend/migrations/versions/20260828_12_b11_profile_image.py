"""add persona profile image

Revision ID: 20260828_12
Revises: 20260828_11
"""

from alembic import op
import sqlalchemy as sa

revision = "20260828_12"
down_revision = "20260828_11"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("personas", sa.Column("profile_image_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("personas", "profile_image_url")
