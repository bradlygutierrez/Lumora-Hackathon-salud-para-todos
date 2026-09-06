"""Initial access catalogs.

Revision ID: 20260820_01
Revises:
"""

from alembic import op
import sqlalchemy as sa

revision = "20260820_01"
down_revision = None
branch_labels = None
depends_on = None


def _catalog(name: str) -> None:
    op.create_table(
        name,
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.UniqueConstraint("nombre"),
    )
    op.create_index(f"ix_{name}_nombre", name, ["nombre"], unique=True)


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.UniqueConstraint("nombre"),
    )
    op.create_index("ix_roles_nombre", "roles", ["nombre"], unique=True)
    op.create_table(
        "permisos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.UniqueConstraint("nombre"),
    )
    op.create_index("ix_permisos_nombre", "permisos", ["nombre"], unique=True)
    for table in ("estados_cita", "tipos_cita", "sexos", "tipos_sangre"):
        _catalog(table)
    op.create_table(
        "roles_permisos",
        sa.Column("rol_id", sa.Integer(), sa.ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("permiso_id", sa.Integer(), sa.ForeignKey("permisos.id", ondelete="CASCADE"), primary_key=True),
    )


def downgrade() -> None:
    op.drop_table("roles_permisos")
    for table in ("tipos_sangre", "sexos", "tipos_cita", "estados_cita"):
        op.drop_index(f"ix_{table}_nombre", table_name=table)
        op.drop_table(table)
    op.drop_index("ix_permisos_nombre", table_name="permisos")
    op.drop_table("permisos")
    op.drop_index("ix_roles_nombre", table_name="roles")
    op.drop_table("roles")
