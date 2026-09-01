"""B17 medical affiliations and safe professional provisioning."""
from alembic import op
import sqlalchemy as sa

revision = "20260901_16_b17"
down_revision = "20260831_15_b14"
branch_labels = None
depends_on = None

def upgrade():
    op.alter_column("eventos_auditoria", "accion", type_=sa.String(50), existing_type=sa.String(10))
    op.add_column("profesionales_salud", sa.Column("licencia_verificada", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column("profesionales_salud", sa.Column("licencia_verificada_en", sa.DateTime(timezone=True), nullable=True))
    op.add_column("profesionales_salud", sa.Column("licencia_verificada_por_usuario_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=True))
    op.create_table("afiliaciones_medicas", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("tipo", sa.String(20), nullable=False), sa.Column("nombre", sa.String(200), nullable=False), sa.Column("correo_contacto", sa.String(255), nullable=False), sa.Column("telefono_contacto", sa.String(30)), sa.Column("cupos_comprados", sa.Integer(), nullable=False), sa.Column("estado", sa.String(20), server_default="pending", nullable=False), sa.Column("pago_estado", sa.String(20), server_default="pending", nullable=False), sa.Column("pago_referencia", sa.String(255)), sa.Column("inicia_en", sa.DateTime(timezone=True)), sa.Column("expira_en", sa.DateTime(timezone=True)), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.CheckConstraint("tipo IN ('independiente', 'institucion')", name="ck_afiliacion_tipo"), sa.CheckConstraint("estado IN ('pending', 'active', 'suspended', 'cancelled')", name="ck_afiliacion_estado"), sa.CheckConstraint("pago_estado IN ('pending', 'paid')", name="ck_afiliacion_pago_estado"), sa.CheckConstraint("cupos_comprados >= 1", name="ck_afiliacion_cupos_positivos"))
    op.create_index("ix_afiliaciones_medicas_tipo", "afiliaciones_medicas", ["tipo"])
    op.create_index("ix_afiliaciones_medicas_estado", "afiliaciones_medicas", ["estado"])
    op.create_index("ix_afiliaciones_medicas_pago_estado", "afiliaciones_medicas", ["pago_estado"])
    op.create_table("afiliaciones_profesionales", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("afiliacion_id", sa.Integer(), sa.ForeignKey("afiliaciones_medicas.id", ondelete="CASCADE"), nullable=False), sa.Column("profesional_id", sa.Integer(), sa.ForeignKey("profesionales_salud.id"), nullable=False), sa.Column("activo", sa.Boolean(), server_default=sa.text("true"), nullable=False), sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.create_index("ix_afiliaciones_profesionales_afiliacion_id", "afiliaciones_profesionales", ["afiliacion_id"])
    op.create_index("ix_afiliaciones_profesionales_profesional_id", "afiliaciones_profesionales", ["profesional_id"])
    op.execute(sa.text("INSERT INTO permisos (nombre, descripcion) SELECT 'afiliaciones:manage', 'Administrar afiliaciones mÃ©dicas' WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'afiliaciones:manage')"))
    op.execute(sa.text("INSERT INTO roles (nombre, descripcion) SELECT 'Profesional de Salud', 'Acceso clÃ­nico sujeto a afiliaciÃ³n vigente' WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'Profesional de Salud')"))
    op.execute(sa.text("INSERT INTO roles_permisos (rol_id, permiso_id) SELECT r.id, p.id FROM roles r CROSS JOIN permisos p WHERE r.nombre = 'Profesional de Salud' AND p.nombre = 'clinica:manage' AND NOT EXISTS (SELECT 1 FROM roles_permisos rp WHERE rp.rol_id=r.id AND rp.permiso_id=p.id)"))
    op.execute(sa.text("INSERT INTO roles_permisos (rol_id, permiso_id) SELECT r.id, p.id FROM roles r CROSS JOIN permisos p WHERE r.nombre = 'Administrador' AND p.nombre = 'afiliaciones:manage' AND NOT EXISTS (SELECT 1 FROM roles_permisos rp WHERE rp.rol_id=r.id AND rp.permiso_id=p.id)"))

def downgrade():
    op.drop_table("afiliaciones_profesionales")
    op.drop_table("afiliaciones_medicas")
    op.drop_column("profesionales_salud", "licencia_verificada_por_usuario_id")
    op.drop_column("profesionales_salud", "licencia_verificada_en")
    op.drop_column("profesionales_salud", "licencia_verificada")

