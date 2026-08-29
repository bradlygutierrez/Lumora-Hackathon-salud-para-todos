"""agregar objetivo, progreso y unidad a recordatorios

Revision ID: 870d8ec2be7b
Revises: 20260828_12
Create Date: 2026-08-29 01:31:15.683147
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '870d8ec2be7b'
down_revision: Union[str, Sequence[str], None] = '20260828_12'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # A10: solo las 3 columnas nuevas de "recordatorios" (seguimiento con
    # objetivo/progreso). El autogenerate tambien detecto una llave
    # foranea distinta en horarios_medicamento y un indice + 2 check
    # constraints "de mas" en relaciones_paciente -- eso es deriva
    # preexistente entre el modelo y la base real, no relacionado con
    # A10, asi que se saco a mano de esta migracion (ver conversacion del
    # 2026-08-29).
    op.add_column('recordatorios', sa.Column('objetivo_cantidad', sa.Float(), nullable=True))
    op.add_column('recordatorios', sa.Column('progreso_actual', sa.Float(), nullable=True))
    op.add_column('recordatorios', sa.Column('unidad', sa.String(length=30), nullable=True))


def downgrade() -> None:
    op.drop_column('recordatorios', 'unidad')
    op.drop_column('recordatorios', 'progreso_actual')
    op.drop_column('recordatorios', 'objetivo_cantidad')
