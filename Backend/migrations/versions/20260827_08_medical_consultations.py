"""Add medical consultations, vital signs and clinical notes.

Revision ID: 20260827_08
Revises: 20260826_07
"""

from alembic import op
import sqlalchemy as sa


revision = "20260827_08"
down_revision = "20260826_07"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "motivos_consulta",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(100), nullable=False),
        sa.Column("activo", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.UniqueConstraint("nombre"),
    )
    op.create_index("ix_motivos_consulta_nombre", "motivos_consulta", ["nombre"], unique=True)
    op.create_table(
        "consultas_medicas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("expediente_id", sa.Integer(), sa.ForeignKey("expedientes.id"), nullable=False),
        sa.Column("paciente_id", sa.Integer(), sa.ForeignKey("pacientes.id"), nullable=False),
        sa.Column("profesional_id", sa.Integer(), sa.ForeignKey("profesionales_salud.id"), nullable=False),
        sa.Column("motivo_consulta_id", sa.Integer(), sa.ForeignKey("motivos_consulta.id"), nullable=True),
        sa.Column("fecha_consulta", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("motivo", sa.String(600), nullable=True),
        sa.Column("sintomas", sa.Text(), nullable=True),
        sa.Column("evaluacion", sa.Text(), nullable=True),
        sa.Column("indicaciones", sa.Text(), nullable=True),
        sa.Column("observaciones", sa.Text(), nullable=True),
        sa.Column("activo", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    for column in (
        "expediente_id",
        "paciente_id",
        "profesional_id",
        "motivo_consulta_id",
        "fecha_consulta",
        "deleted_at",
    ):
        op.create_index(f"ix_consultas_medicas_{column}", "consultas_medicas", [column])
    op.create_table(
        "signos_vitales",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("consulta_id", sa.Integer(), sa.ForeignKey("consultas_medicas.id"), nullable=False),
        sa.Column("temperatura_c", sa.Float(), nullable=True),
        sa.Column("frecuencia_cardiaca", sa.Integer(), nullable=True),
        sa.Column("frecuencia_respiratoria", sa.Integer(), nullable=True),
        sa.Column("presion_sistolica", sa.Integer(), nullable=True),
        sa.Column("presion_diastolica", sa.Integer(), nullable=True),
        sa.Column("saturacion_oxigeno", sa.Integer(), nullable=True),
        sa.Column("peso_kg", sa.Float(), nullable=True),
        sa.Column("talla_cm", sa.Float(), nullable=True),
        sa.Column("glucosa_mg_dl", sa.Integer(), nullable=True),
        sa.Column("registrado_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_signos_vitales_consulta_id", "signos_vitales", ["consulta_id"])
    op.create_index("ix_signos_vitales_registrado_at", "signos_vitales", ["registrado_at"])
    op.create_table(
        "notas_clinicas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("consulta_id", sa.Integer(), sa.ForeignKey("consultas_medicas.id"), nullable=False),
        sa.Column("autor_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("contenido", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("activo", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    for column in ("consulta_id", "autor_id", "created_at", "deleted_at"):
        op.create_index(f"ix_notas_clinicas_{column}", "notas_clinicas", [column])


def downgrade() -> None:
    op.drop_table("notas_clinicas")
    op.drop_table("signos_vitales")
    op.drop_table("consultas_medicas")
    op.drop_index("ix_motivos_consulta_nombre", table_name="motivos_consulta")
    op.drop_table("motivos_consulta")
