"""merge_heads

Revision ID: cc0fc6fceb9f
Revises: 20260828_09, ce75376fbc26
Create Date: 2026-08-23 01:03:22.519553
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'cc0fc6fceb9f'
down_revision: Union[str, Sequence[str], None] = ('20260828_09', 'ce75376fbc26')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
