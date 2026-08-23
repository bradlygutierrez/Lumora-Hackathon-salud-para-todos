"""Add diagnoses and medical conditions.

Revision ID: 20260828_09
Revises: 20260827_08
"""

from alembic import op
import sqlalchemy as sa


revision = "20260828_09"
down_revision = "20260827_08"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "diagnosticos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("consulta_id", sa.Integer(), sa.ForeignKey("consultas_medicas.id"), nullable=False),
        sa.Column("expediente_id", sa.Integer(), sa.ForeignKey("expedientes.id"), nullable=False),
        sa.Column("profesional_id", sa.Integer(), sa.ForeignKey("profesionales_salud.id"), nullable=False),
        sa.Column("tipo_diagnostico_id", sa.Integer(), sa.ForeignKey("tipos_diagnostico.id"), nullable=False),
        sa.Column("descripcion", sa.String(700), nullable=False),
        sa.Column("es_principal", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("fecha_diagnostico", sa.Date(), server_default=sa.func.current_date(), nullable=False),
        sa.Column("activo", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    for column in ("consulta_id", "expediente_id", "profesional_id", "tipo_diagnostico_id", "deleted_at"):
        op.create_index(f"ix_diagnosticos_{column}", "diagnosticos", [column])
    op.create_table(
        "condiciones_medicas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("expediente_id", sa.Integer(), sa.ForeignKey("expedientes.id"), nullable=False),
        sa.Column("paciente_id", sa.Integer(), sa.ForeignKey("pacientes.id"), nullable=False),
        sa.Column("diagnostico_id", sa.Integer(), sa.ForeignKey("diagnosticos.id"), nullable=True),
        sa.Column("estado_condicion_id", sa.Integer(), sa.ForeignKey("estados_condicion.id"), nullable=False),
        sa.Column("nombre", sa.String(180), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("fecha_inicio", sa.Date(), nullable=True),
        sa.Column("fecha_fin", sa.Date(), nullable=True),
        sa.Column("activo", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    for column in ("expediente_id", "paciente_id", "diagnostico_id", "estado_condicion_id", "deleted_at"):
        op.create_index(f"ix_condiciones_medicas_{column}", "condiciones_medicas", [column])
    op.create_table(
        "historial_condiciones",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("condicion_id", sa.Integer(), sa.ForeignKey("condiciones_medicas.id"), nullable=False),
        sa.Column("estado_anterior_id", sa.Integer(), sa.ForeignKey("estados_condicion.id"), nullable=True),
        sa.Column("estado_nuevo_id", sa.Integer(), sa.ForeignKey("estados_condicion.id"), nullable=True),
        sa.Column("accion", sa.String(30), nullable=False),
        sa.Column("motivo", sa.String(300), nullable=True),
        sa.Column("usuario_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_historial_condiciones_condicion_id", "historial_condiciones", ["condicion_id"])
    op.create_index("ix_historial_condiciones_usuario_id", "historial_condiciones", ["usuario_id"])
    op.create_index("ix_historial_condiciones_created_at", "historial_condiciones", ["created_at"])


def downgrade() -> None:
    op.drop_table("historial_condiciones")
    op.drop_table("condiciones_medicas")
    op.drop_table("diagnosticos")
