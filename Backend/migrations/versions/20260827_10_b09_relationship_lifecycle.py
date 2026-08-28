"""Add lifecycle and access metadata to caregiver relationships."""

from alembic import op
import sqlalchemy as sa


revision = "20260827_10"
down_revision = "da9b16284bf3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "relaciones_paciente",
        sa.Column("estado", sa.String(length=20), server_default="active", nullable=False),
    )
    op.add_column(
        "relaciones_paciente",
        sa.Column("nivel_acceso", sa.String(length=20), server_default="read", nullable=False),
    )
    op.add_column(
        "relaciones_paciente",
        sa.Column("expira_en", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_check_constraint(
        "ck_relaciones_paciente_estado",
        "relaciones_paciente",
        "estado IN ('pending', 'active', 'revoked', 'inactive', 'rejected')",
    )
    op.create_check_constraint(
        "ck_relaciones_paciente_nivel_acceso",
        "relaciones_paciente",
        "nivel_acceso IN ('read', 'write')",
    )
    op.create_index(
        "ix_relaciones_paciente_usuario_estado",
        "relaciones_paciente",
        ["usuario_relacionado_id", "estado", "activo"],
    )


def downgrade() -> None:
    op.drop_index("ix_relaciones_paciente_usuario_estado", table_name="relaciones_paciente")
    op.drop_constraint("ck_relaciones_paciente_nivel_acceso", "relaciones_paciente", type_="check")
    op.drop_constraint("ck_relaciones_paciente_estado", "relaciones_paciente", type_="check")
    op.drop_column("relaciones_paciente", "expira_en")
    op.drop_column("relaciones_paciente", "nivel_acceso")
    op.drop_column("relaciones_paciente", "estado")
