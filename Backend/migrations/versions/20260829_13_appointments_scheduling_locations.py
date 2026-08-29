"""appointment scheduling availability and healthcare locations"""
from alembic import op
import sqlalchemy as sa

revision = "20260829_13"
down_revision = "870d8ec2be7b"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table("horarios_profesionales",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("profesional_id", sa.Integer(), sa.ForeignKey("profesionales_salud.id"), nullable=False),
        sa.Column("dia_semana", sa.Integer(), nullable=False),
        sa.Column("hora_inicio", sa.Time(), nullable=False),
        sa.Column("hora_fin", sa.Time(), nullable=False),
        sa.Column("activo", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.CheckConstraint("dia_semana BETWEEN 0 AND 6", name="ck_horario_dia_semana"),
        sa.CheckConstraint("hora_inicio < hora_fin", name="ck_horario_horas"),
    )
    op.create_index("ix_horarios_profesionales_profesional_id", "horarios_profesionales", ["profesional_id"])
    op.create_table("ubicaciones_atencion",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(150), nullable=False),
        sa.Column("direccion", sa.String(500), nullable=False),
        sa.Column("consultorio", sa.String(100)),
        sa.Column("latitud", sa.Float()), sa.Column("longitud", sa.Float()),
        sa.Column("activo", sa.Boolean(), server_default=sa.true(), nullable=False),
    )
    op.add_column("citas", sa.Column("ubicacion_id", sa.Integer(), sa.ForeignKey("ubicaciones_atencion.id"), nullable=True))
    op.create_index("ix_citas_ubicacion_id", "citas", ["ubicacion_id"])

def downgrade():
    op.drop_index("ix_citas_ubicacion_id", table_name="citas")
    op.drop_column("citas", "ubicacion_id")
    op.drop_table("ubicaciones_atencion")
    op.drop_index("ix_horarios_profesionales_profesional_id", table_name="horarios_profesionales")
    op.drop_table("horarios_profesionales")
