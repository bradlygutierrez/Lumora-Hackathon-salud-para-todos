"""Sessions, login attempts, appointments and audit events.

Revision ID: 20260824_05
Revises: 20260823_04
"""

from alembic import op
import sqlalchemy as sa

revision = "20260824_05"
down_revision = "20260823_04"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sesiones_usuario",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("usuario_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("refresh_token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ip", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_sesiones_usuario_usuario_id", "sesiones_usuario", ["usuario_id"])
    op.create_index("ix_sesiones_usuario_refresh_token_hash", "sesiones_usuario", ["refresh_token_hash"], unique=True)
    op.create_index("ix_sesiones_usuario_expires_at", "sesiones_usuario", ["expires_at"])
    op.create_table(
        "intentos_inicio_sesion",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("login", sa.String(255), nullable=False),
        sa.Column("usuario_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=True),
        sa.Column("exitoso", sa.Boolean(), nullable=False),
        sa.Column("motivo", sa.String(100), nullable=True),
        sa.Column("ip", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_intentos_inicio_sesion_login", "intentos_inicio_sesion", ["login"])
    op.create_index("ix_intentos_inicio_sesion_usuario_id", "intentos_inicio_sesion", ["usuario_id"])
    op.create_table(
        "citas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("paciente_id", sa.Integer(), sa.ForeignKey("pacientes.id"), nullable=False),
        sa.Column("profesional_id", sa.Integer(), sa.ForeignKey("profesionales_salud.id"), nullable=False),
        sa.Column("tipo_cita_id", sa.Integer(), sa.ForeignKey("tipos_cita.id"), nullable=True),
        sa.Column("estado_cita_id", sa.Integer(), sa.ForeignKey("estados_cita.id"), nullable=True),
        sa.Column("inicio", sa.DateTime(timezone=True), nullable=False),
        sa.Column("fin", sa.DateTime(timezone=True), nullable=False),
        sa.Column("notas", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("inicio < fin", name="ck_citas_periodo"),
        sa.CheckConstraint("fin <= inicio + interval '12 hours'", name="ck_citas_duracion"),
    )
    for column in ("paciente_id", "profesional_id", "inicio", "fin"):
        op.create_index(f"ix_citas_{column}", "citas", [column])
    op.create_table(
        "eventos_auditoria",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("usuario_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("accion", sa.String(10), nullable=False),
        sa.Column("entidad", sa.String(100), nullable=False),
        sa.Column("entidad_id", sa.Integer(), nullable=False),
        sa.Column("datos_anteriores", sa.JSON(), nullable=True),
        sa.Column("datos_nuevos", sa.JSON(), nullable=True),
        sa.Column("ip", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    for column in ("usuario_id", "accion", "entidad", "entidad_id"):
        op.create_index(f"ix_eventos_auditoria_{column}", "eventos_auditoria", [column])


def downgrade() -> None:
    op.drop_table("eventos_auditoria")
    op.drop_table("citas")
    op.drop_table("intentos_inicio_sesion")
    op.drop_table("sesiones_usuario")
