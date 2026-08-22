from typing import ClassVar

from sqlalchemy import Column, ForeignKey, String, Table, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from lumora_api.db.base import Base


roles_permisos = Table(
    "roles_permisos",
    Base.metadata,
    Column("rol_id", ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permiso_id", ForeignKey("permisos.id", ondelete="CASCADE"), primary_key=True),
)


class CatalogModel(Base):
    __abstract__ = True
    resource_name: ClassVar[str]
    __table_args__ = (UniqueConstraint("nombre"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, index=True)


class Rol(CatalogModel):
    __tablename__ = "roles"
    resource_name = "Rol"

    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    permisos: Mapped[list["Permiso"]] = relationship(
        secondary=roles_permisos, back_populates="roles", lazy="selectin"
    )
    usuarios: Mapped[list["Usuario"]] = relationship(
        secondary="usuario_roles", back_populates="roles", lazy="selectin"
    )


class Permiso(CatalogModel):
    __tablename__ = "permisos"
    resource_name = "Permiso"

    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    roles: Mapped[list[Rol]] = relationship(
        secondary=roles_permisos, back_populates="permisos", lazy="selectin"
    )


class EstadoCita(CatalogModel):
    __tablename__ = "estados_cita"
    resource_name = "Estado de cita"


class TipoCita(CatalogModel):
    __tablename__ = "tipos_cita"
    resource_name = "Tipo de cita"


class Sexo(CatalogModel):
    __tablename__ = "sexos"
    resource_name = "Sexo"


class TipoSangre(CatalogModel):
    __tablename__ = "tipos_sangre"
    resource_name = "Tipo de sangre"


class RolPermiso(Base):
    __table__ = roles_permisos


class EstadoDosis(CatalogModel):
    __tablename__ = "estados_dosis"
    resource_name = "Estado de dosis"


class EstadoReceta(CatalogModel):
    __tablename__ = "estados_receta"
    resource_name = "Estado de receta"


class ViaAdministracion(CatalogModel):
    __tablename__ = "vias_administracion"
    resource_name = "Vía de administración"


class UnidadMedida(CatalogModel):
    __tablename__ = "unidades_medida"
    resource_name = "Unidad de medida"


class OrigenRegistro(CatalogModel):
    __tablename__ = "origenes_registro"
    resource_name = "Origen de registro"


class NivelSeveridad(CatalogModel):
    __tablename__ = "niveles_severidad"
    resource_name = "Nivel de severidad"


class TipoAlerta(CatalogModel):
    __tablename__ = "tipos_alerta"
    resource_name = "Tipo de alerta"


class TipoRecordatorio(CatalogModel):
    __tablename__ = "tipos_recordatorio"
    resource_name = "Tipo de recordatorio"


class TipoRelacion(CatalogModel):
    __tablename__ = "tipos_relacion"
    resource_name = "Tipo de relación"