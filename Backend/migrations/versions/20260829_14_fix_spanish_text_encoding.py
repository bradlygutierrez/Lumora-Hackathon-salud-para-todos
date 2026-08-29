"""Fix corrupted Spanish text in appointment locations."""

from alembic import op


revision = "20260829_14"
down_revision = "20260829_13"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "UPDATE ubicaciones_atencion "
        "SET nombre = 'Clínica Lumora' "
        "WHERE nombre = 'Cl?nica Lumora'"
    )


def downgrade() -> None:
    op.execute(
        "UPDATE ubicaciones_atencion "
        "SET nombre = 'Cl?nica Lumora' "
        "WHERE nombre = 'Clínica Lumora'"
    )
