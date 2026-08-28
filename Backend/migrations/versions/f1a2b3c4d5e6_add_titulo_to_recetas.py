"""add titulo to recetas

Revision ID: f1a2b3c4d5e6
Revises: da9b16284bf3
Create Date: 2026-08-28 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'da9b16284bf3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('recetas', sa.Column('titulo', sa.String(length=150), nullable=True))


def downgrade() -> None:
    op.drop_column('recetas', 'titulo')
