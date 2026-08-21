"""Identity and clinical profiles.

Revision ID: 20260821_02
Revises: 20260820_01
"""

from alembic import op
import sqlalchemy as sa

revision = "20260821_02"
down_revision = "20260820_01"
branch_labels = None
depends_on = None


def _soft_delete_index(table: str) -> None:
    op.create_index(f"ix_{table}_deleted_at", table, ["deleted_at"])


def upgrade() -> None:
    op.create_table(
        "personas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nombres", sa.String(100), nullable=False),
        sa.Column("apellidos", sa.String(100), nullable=False),
        sa.Column("fecha_nacimiento", sa.Date(), nullable=True),
        sa.Column("telefono", sa.String(30), nullable=True),
        sa.Column("sexo_id", sa.Integer(), sa.ForeignKey("sexos.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    _soft_delete_index("personas")

    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("persona_id", sa.Integer(), sa.ForeignKey("personas.id"), nullable=False),
        sa.Column("rol_id", sa.Integer(), sa.ForeignKey("roles.id"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("username", sa.String(50), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("activo", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_usuarios_persona_id", "usuarios", ["persona_id"], unique=True)
    op.create_index("ix_usuarios_rol_id", "usuarios", ["rol_id"])
    op.create_index("ix_usuarios_email", "usuarios", ["email"], unique=True)
    op.create_index("ix_usuarios_username", "usuarios", ["username"], unique=True)
    _soft_delete_index("usuarios")

    op.create_table(
        "pacientes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("persona_id", sa.Integer(), sa.ForeignKey("personas.id"), nullable=False),
        sa.Column("tipo_sangre_id", sa.Integer(), sa.ForeignKey("tipos_sangre.id"), nullable=True),
        sa.Column("alergias", sa.Text(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_pacientes_persona_id", "pacientes", ["persona_id"], unique=True)
    _soft_delete_index("pacientes")

    op.create_table(
        "profesionales_salud",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("persona_id", sa.Integer(), sa.ForeignKey("personas.id"), nullable=False),
        sa.Column("especialidad", sa.String(100), nullable=False),
        sa.Column("numero_licencia", sa.String(100), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_profesionales_salud_persona_id", "profesionales_salud", ["persona_id"], unique=True)
    op.create_index("ix_profesionales_salud_numero_licencia", "profesionales_salud", ["numero_licencia"], unique=True)
    _soft_delete_index("profesionales_salud")

    op.create_table(
        "contactos_emergencia",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("paciente_id", sa.Integer(), sa.ForeignKey("pacientes.id"), nullable=False),
        sa.Column("nombre", sa.String(150), nullable=False),
        sa.Column("parentesco", sa.String(50), nullable=False),
        sa.Column("telefono", sa.String(30), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_contactos_emergencia_paciente_id", "contactos_emergencia", ["paciente_id"])
    _soft_delete_index("contactos_emergencia")

    op.create_table(
        "direcciones",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("persona_id", sa.Integer(), sa.ForeignKey("personas.id"), nullable=False),
        sa.Column("linea_1", sa.String(200), nullable=False),
        sa.Column("ciudad", sa.String(100), nullable=False),
        sa.Column("departamento", sa.String(100), nullable=True),
        sa.Column("pais", sa.String(100), nullable=False),
        sa.Column("codigo_postal", sa.String(20), nullable=True),
        sa.Column("es_principal", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_direcciones_persona_id", "direcciones", ["persona_id"])
    _soft_delete_index("direcciones")


def downgrade() -> None:
    for table in (
        "direcciones",
        "contactos_emergencia",
        "profesionales_salud",
        "pacientes",
        "usuarios",
        "personas",
    ):
        op.drop_table(table)
