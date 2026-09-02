"""A15/B15 -- permiso independiente de ver/descargar el expediente

Revision ID: 20260902_16_a15
Revises: 20260901_16_b17
Create Date: 2026-09-02

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260902_16_a15"
down_revision: str | Sequence[str] | None = "20260901_16_b17"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "relaciones_paciente",
        sa.Column(
            "puede_ver_expediente",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )


def downgrade() -> None:
    op.drop_column("relaciones_paciente", "puede_ver_expediente")
