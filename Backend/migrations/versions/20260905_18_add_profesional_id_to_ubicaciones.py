"""Agregar profesional_id a ubicaciones_atencion (direccion de consulta propia).

Revision ID: 20260905_18_addr
Revises: 20260903_17_i03
Create Date: 2026-09-05

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260905_18_addr"
down_revision: str | Sequence[str] | None = "20260903_17_i03"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "ubicaciones_atencion",
        sa.Column("profesional_id", sa.Integer(), sa.ForeignKey("profesionales_salud.id"), nullable=True),
    )
    op.create_index(
        "ix_ubicaciones_atencion_profesional_id",
        "ubicaciones_atencion",
        ["profesional_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_ubicaciones_atencion_profesional_id", table_name="ubicaciones_atencion")
    op.drop_column("ubicaciones_atencion", "profesional_id")
