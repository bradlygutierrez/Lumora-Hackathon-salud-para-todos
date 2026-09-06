"""Add clinical catalogs.

Revision ID: 20260825_06
Revises: 10c1a979619e
"""

from alembic import op
import sqlalchemy as sa


revision = "20260825_06"
down_revision = "10c1a979619e"
branch_labels = None
depends_on = None


TABLES = (
    "cargos_salud",
    "especialidades",
    "estados_expediente",
    "estados_condicion",
    "tipos_antecedente",
    "tipos_diagnostico",
)


def upgrade() -> None:
    for table_name in TABLES:
        op.create_table(
            table_name,
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("nombre", sa.String(100), nullable=False),
            sa.Column("activo", sa.Boolean(), server_default=sa.true(), nullable=False),
            sa.UniqueConstraint("nombre"),
        )
        op.create_index(
            op.f(f"ix_{table_name}_nombre"), table_name, ["nombre"], unique=True
        )


def downgrade() -> None:
    for table_name in reversed(TABLES):
        op.drop_index(op.f(f"ix_{table_name}_nombre"), table_name=table_name)
        op.drop_table(table_name)
