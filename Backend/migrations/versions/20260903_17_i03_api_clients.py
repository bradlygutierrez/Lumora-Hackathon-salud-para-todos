"""I03 -- identificacion de clientes API (clientes_api, claves_api_cliente).

Revision ID: 20260903_17_i03
Revises: 20260902_16_a15
Create Date: 2026-09-03

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260903_17_i03"
down_revision: str | Sequence[str] | None = "20260902_16_a15"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "clientes_api",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("client_id", sa.String(60), nullable=False),
        sa.Column("nombre", sa.String(120), nullable=False),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_clientes_api_client_id", "clientes_api", ["client_id"], unique=True)

    op.create_table(
        "claves_api_cliente",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("cliente_id", sa.Integer(), sa.ForeignKey("clientes_api.id", ondelete="CASCADE"), nullable=False),
        sa.Column("key_prefix", sa.String(12), nullable=False),
        sa.Column("key_hash", sa.String(64), nullable=False),
        sa.Column("activa", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_claves_api_cliente_cliente_id", "claves_api_cliente", ["cliente_id"])
    op.create_index("ix_claves_api_cliente_key_prefix", "claves_api_cliente", ["key_prefix"])
    op.create_index("ix_claves_api_cliente_key_hash", "claves_api_cliente", ["key_hash"], unique=True)

    op.execute(
        sa.text(
            "INSERT INTO permisos (nombre, descripcion) "
            "SELECT 'sistema:clientes', 'Administrar clientes API' "
            "WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'sistema:clientes')"
        )
    )
    op.execute(
        sa.text(
            "INSERT INTO roles_permisos (rol_id, permiso_id) "
            "SELECT r.id, p.id FROM roles r CROSS JOIN permisos p "
            "WHERE r.nombre = 'Administrador' AND p.nombre = 'sistema:clientes' "
            "AND NOT EXISTS (SELECT 1 FROM roles_permisos rp WHERE rp.rol_id=r.id AND rp.permiso_id=p.id)"
        )
    )


def downgrade() -> None:
    op.drop_table("claves_api_cliente")
    op.drop_table("clientes_api")
