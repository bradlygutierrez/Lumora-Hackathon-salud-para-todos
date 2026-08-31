"""Ensure caregiver role and backfill active relationships.

Revision ID: 20260831_15_b14
Revises: 4489b0b86264
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260831_15_b14"
down_revision: str | Sequence[str] | None = "4489b0b86264"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    metadata = sa.MetaData()
    roles = sa.Table(
        "roles",
        metadata,
        sa.Column("id", sa.Integer),
        sa.Column("nombre", sa.String),
        sa.Column("descripcion", sa.String),
    )
    user_roles = sa.Table(
        "usuario_roles",
        metadata,
        sa.Column("usuario_id", sa.Integer),
        sa.Column("rol_id", sa.Integer),
    )
    relationships = sa.Table(
        "relaciones_paciente",
        metadata,
        sa.Column("usuario_relacionado_id", sa.Integer),
        sa.Column("activo", sa.Boolean),
        sa.Column("estado", sa.String),
    )

    caregiver_id = bind.scalar(
        sa.select(roles.c.id).where(roles.c.nombre == "Cuidador")
    )
    if caregiver_id is None:
        result = bind.execute(
            roles.insert()
            .values(nombre="Cuidador", descripcion="Acceso base de cuidador")
            .returning(roles.c.id)
        )
        caregiver_id = result.scalar_one()

    related_user_ids = bind.scalars(
        sa.select(relationships.c.usuario_relacionado_id)
        .where(
            relationships.c.activo.is_(True),
            relationships.c.estado == "active",
        )
        .distinct()
    )
    for user_id in related_user_ids:
        exists = bind.scalar(
            sa.select(sa.literal(True)).where(
                sa.exists().where(
                    user_roles.c.usuario_id == user_id,
                    user_roles.c.rol_id == caregiver_id,
                )
            )
        )
        if not exists:
            bind.execute(
                user_roles.insert().values(
                    usuario_id=user_id,
                    rol_id=caregiver_id,
                )
            )


def downgrade() -> None:
    # Conservative: associations may represent registrations after deployment.
    pass
