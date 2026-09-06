"""agregar estado a recordatorios y tabla recordatorio_horarios

Revision ID: c3d4e5f6a7b8
Revises: 870d8ec2be7b
Create Date: 2026-08-30 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = '870d8ec2be7b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'recordatorios',
        sa.Column('estado', sa.String(length=20), nullable=False, server_default='pendiente'),
    )

    op.create_table(
        'recordatorio_horarios',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('recordatorio_id', sa.Integer(), nullable=False),
        sa.Column('hora', sa.Time(), nullable=False),
        sa.Column('cantidad_objetivo', sa.Float(), nullable=True),
        sa.Column('activo', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['recordatorio_id'], ['recordatorios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_recordatorio_horarios_id'), 'recordatorio_horarios', ['id'], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_recordatorio_horarios_id'), table_name='recordatorio_horarios')
    op.drop_table('recordatorio_horarios')
    op.drop_column('recordatorios', 'estado')
