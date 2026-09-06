"""Add clinical records and patient conditions.

Revision ID: 20260826_07
Revises: 20260825_06
"""

from alembic import op
import sqlalchemy as sa


revision = "20260826_07"
down_revision = "20260825_06"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "expedientes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("paciente_id", sa.Integer(), sa.ForeignKey("pacientes.id"), nullable=False),
        sa.Column(
            "estado_expediente_id",
            sa.Integer(),
            sa.ForeignKey("estados_expediente.id"),
            nullable=False,
        ),
        sa.Column("numero_expediente", sa.String(50), nullable=False),
        sa.Column("notas", sa.Text(), nullable=True),
        sa.Column("activo", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_expedientes_paciente_id", "expedientes", ["paciente_id"])
    op.create_index("ix_expedientes_estado_expediente_id", "expedientes", ["estado_expediente_id"])
    op.create_index("ix_expedientes_numero_expediente", "expedientes", ["numero_expediente"], unique=True)
    op.create_index("ix_expedientes_deleted_at", "expedientes", ["deleted_at"])
    op.create_index(
        "uq_expedientes_paciente_activo",
        "expedientes",
        ["paciente_id"],
        unique=True,
        postgresql_where=sa.text("activo = true AND deleted_at IS NULL"),
        sqlite_where=sa.text("activo = 1 AND deleted_at IS NULL"),
    )
    op.create_table(
        "antecedentes_medicos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("expediente_id", sa.Integer(), sa.ForeignKey("expedientes.id"), nullable=False),
        sa.Column(
            "tipo_antecedente_id",
            sa.Integer(),
            sa.ForeignKey("tipos_antecedente.id"),
            nullable=False,
        ),
        sa.Column("descripcion", sa.String(300), nullable=False),
        sa.Column("fecha", sa.Date(), nullable=True),
        sa.Column("activo", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_antecedentes_medicos_expediente_id", "antecedentes_medicos", ["expediente_id"])
    op.create_index("ix_antecedentes_medicos_tipo_antecedente_id", "antecedentes_medicos", ["tipo_antecedente_id"])
    op.create_index("ix_antecedentes_medicos_deleted_at", "antecedentes_medicos", ["deleted_at"])
    op.create_table(
        "alergias_clinicas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("paciente_id", sa.Integer(), sa.ForeignKey("pacientes.id"), nullable=False),
        sa.Column("nombre", sa.String(180), nullable=False),
        sa.Column("nivel_severidad_id", sa.Integer(), sa.ForeignKey("niveles_severidad.id"), nullable=True),
        sa.Column("estado_condicion_id", sa.Integer(), sa.ForeignKey("estados_condicion.id"), nullable=True),
        sa.Column("observaciones", sa.Text(), nullable=True),
        sa.Column("activo", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_alergias_clinicas_paciente_id", "alergias_clinicas", ["paciente_id"])
    op.create_index("ix_alergias_clinicas_nivel_severidad_id", "alergias_clinicas", ["nivel_severidad_id"])
    op.create_index("ix_alergias_clinicas_estado_condicion_id", "alergias_clinicas", ["estado_condicion_id"])
    op.create_index("ix_alergias_clinicas_deleted_at", "alergias_clinicas", ["deleted_at"])
    op.create_table(
        "discapacidades",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("paciente_id", sa.Integer(), sa.ForeignKey("pacientes.id"), nullable=False),
        sa.Column("nombre", sa.String(180), nullable=False),
        sa.Column("estado_condicion_id", sa.Integer(), sa.ForeignKey("estados_condicion.id"), nullable=True),
        sa.Column("observaciones", sa.Text(), nullable=True),
        sa.Column("activo", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_discapacidades_paciente_id", "discapacidades", ["paciente_id"])
    op.create_index("ix_discapacidades_estado_condicion_id", "discapacidades", ["estado_condicion_id"])
    op.create_index("ix_discapacidades_deleted_at", "discapacidades", ["deleted_at"])


def downgrade() -> None:
    op.drop_table("discapacidades")
    op.drop_table("alergias_clinicas")
    op.drop_table("antecedentes_medicos")
    op.drop_table("expedientes")
