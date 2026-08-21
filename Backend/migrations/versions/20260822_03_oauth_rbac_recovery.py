"""OAuth RBAC and one-use account tokens.

Revision ID: 20260822_03
Revises: 20260821_02
"""

from alembic import op
import sqlalchemy as sa

revision = "20260822_03"
down_revision = "20260821_02"
branch_labels = None
depends_on = None


def _token_table(name: str) -> None:
    op.create_table(
        name,
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("usuario_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(f"ix_{name}_usuario_id", name, ["usuario_id"])
    op.create_index(f"ix_{name}_token_hash", name, ["token_hash"], unique=True)
    op.create_index(f"ix_{name}_expires_at", name, ["expires_at"])


def upgrade() -> None:
    op.create_table(
        "usuario_roles",
        sa.Column("usuario_id", sa.Integer(), sa.ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("rol_id", sa.Integer(), sa.ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    )
    op.execute(sa.text("INSERT INTO usuario_roles (usuario_id, rol_id) SELECT id, rol_id FROM usuarios"))
    op.drop_index("ix_usuarios_rol_id", table_name="usuarios")
    with op.batch_alter_table("usuarios") as batch:
        batch.add_column(sa.Column("email_verificado", sa.Boolean(), server_default=sa.text("false"), nullable=False))
        batch.drop_column("rol_id")

    _token_table("tokens_recuperacion")
    _token_table("verificaciones_correo")

    op.execute(sa.text("INSERT INTO roles (nombre, descripcion) SELECT 'Paciente', 'Acceso base de paciente' WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'Paciente')"))
    op.execute(sa.text("INSERT INTO permisos (nombre, descripcion) SELECT 'rbac:manage', 'Administrar roles y permisos' WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'rbac:manage')"))
    op.execute(sa.text("INSERT INTO roles_permisos (rol_id, permiso_id) SELECT r.id, p.id FROM roles r CROSS JOIN permisos p WHERE r.nombre = 'Administrador' AND p.nombre = 'rbac:manage' AND NOT EXISTS (SELECT 1 FROM roles_permisos rp WHERE rp.rol_id = r.id AND rp.permiso_id = p.id)"))


def downgrade() -> None:
    op.drop_table("verificaciones_correo")
    op.drop_table("tokens_recuperacion")
    with op.batch_alter_table("usuarios") as batch:
        batch.add_column(sa.Column("rol_id", sa.Integer(), nullable=True))
    op.execute(sa.text("UPDATE usuarios SET rol_id = (SELECT MIN(rol_id) FROM usuario_roles WHERE usuario_id = usuarios.id)"))
    with op.batch_alter_table("usuarios") as batch:
        batch.create_foreign_key("fk_usuarios_rol_id", "roles", ["rol_id"], ["id"])
        batch.drop_column("email_verificado")
    op.create_index("ix_usuarios_rol_id", "usuarios", ["rol_id"])
    op.drop_table("usuario_roles")
