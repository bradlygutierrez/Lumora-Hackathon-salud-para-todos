"""B08 MFA defaults and email OTP challenge storage"""
from alembic import op
import sqlalchemy as sa
revision = "20260828_b08_mfa"
down_revision = ("20260827_10", "f1a2b3c4d5e6")
branch_labels = None
depends_on = None
def upgrade():
    op.alter_column("usuario_metodos_mfa", "activo", server_default=sa.text("false"))
    op.add_column("desafios_autenticacion", sa.Column("codigo_hash", sa.String(length=64), nullable=True))
    op.create_index("ix_desafios_autenticacion_codigo_hash", "desafios_autenticacion", ["codigo_hash"])
def downgrade():
    op.drop_index("ix_desafios_autenticacion_codigo_hash", table_name="desafios_autenticacion")
    op.drop_column("desafios_autenticacion", "codigo_hash")
    op.alter_column("usuario_metodos_mfa", "activo", server_default=sa.text("true"))
