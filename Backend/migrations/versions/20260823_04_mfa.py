"""MFA methods, challenges and recovery codes.

Revision ID: 20260823_04
Revises: 20260822_03
"""

from alembic import op
import sqlalchemy as sa

revision = "20260823_04"
down_revision = "20260822_03"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "metodos_mfa",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(50), nullable=False),
        sa.Column("descripcion", sa.String(200), nullable=True),
    )
    op.create_index("ix_metodos_mfa_nombre", "metodos_mfa", ["nombre"], unique=True)
    op.create_table(
        "usuario_metodos_mfa",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("usuario_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("metodo_id", sa.Integer(), sa.ForeignKey("metodos_mfa.id"), nullable=False),
        sa.Column("secreto_cifrado", sa.String(500), nullable=False),
        sa.Column("activo", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("disabled_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("usuario_id", "metodo_id"),
    )
    op.create_index("ix_usuario_metodos_mfa_usuario_id", "usuario_metodos_mfa", ["usuario_id"])
    op.create_index("ix_usuario_metodos_mfa_metodo_id", "usuario_metodos_mfa", ["metodo_id"])
    op.create_table(
        "desafios_autenticacion",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("usuario_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("usuario_metodo_id", sa.Integer(), sa.ForeignKey("usuario_metodos_mfa.id"), nullable=False),
        sa.Column("desafio_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("intentos", sa.Integer(), server_default="0", nullable=False),
        sa.Column("max_intentos", sa.Integer(), server_default="5", nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    for column, unique in (("usuario_id", False), ("usuario_metodo_id", False), ("desafio_hash", True), ("expires_at", False)):
        op.create_index(f"ix_desafios_autenticacion_{column}", "desafios_autenticacion", [column], unique=unique)
    op.create_table(
        "codigos_recuperacion_mfa",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("usuario_metodo_id", sa.Integer(), sa.ForeignKey("usuario_metodos_mfa.id", ondelete="CASCADE"), nullable=False),
        sa.Column("codigo_hash", sa.String(64), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_codigos_recuperacion_mfa_usuario_metodo_id", "codigos_recuperacion_mfa", ["usuario_metodo_id"])
    op.create_index("ix_codigos_recuperacion_mfa_codigo_hash", "codigos_recuperacion_mfa", ["codigo_hash"], unique=True)
    op.execute(sa.text("INSERT INTO metodos_mfa (nombre, descripcion) VALUES ('totp', 'Aplicación autenticadora TOTP')"))


def downgrade() -> None:
    op.drop_table("codigos_recuperacion_mfa")
    op.drop_table("desafios_autenticacion")
    op.drop_table("usuario_metodos_mfa")
    op.drop_table("metodos_mfa")
