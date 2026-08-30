"""merge heads

Revision ID: 4489b0b86264
Revises: 20260829_14, c3d4e5f6a7b8
Create Date: 2026-08-29 21:04:11.671052
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '4489b0b86264'
down_revision: Union[str, Sequence[str], None] = ('20260829_14', 'c3d4e5f6a7b8')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
