from datetime import datetime
from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from lumora_api.db.base import Base

class AfiliacionMedica(Base):
    __tablename__ = "afiliaciones_medicas"
    __table_args__ = (CheckConstraint("tipo IN ('independiente', 'institucion')", name="ck_afiliacion_tipo"), CheckConstraint("estado IN ('pending', 'active', 'suspended', 'cancelled')", name="ck_afiliacion_estado"), CheckConstraint("pago_estado IN ('pending', 'paid')", name="ck_afiliacion_pago_estado"), CheckConstraint("cupos_comprados >= 1", name="ck_afiliacion_cupos_positivos"), CheckConstraint("tipo != 'independiente' OR cupos_comprados = 1", name="ck_afiliacion_independiente_un_cupo"))
    id: Mapped[int] = mapped_column(primary_key=True)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    correo_contacto: Mapped[str] = mapped_column(String(255), nullable=False)
    telefono_contacto: Mapped[str | None] = mapped_column(String(30), nullable=True)
    cupos_comprados: Mapped[int] = mapped_column(Integer, nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", server_default="pending", index=True)
    pago_estado: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", server_default="pending", index=True)
    pago_referencia: Mapped[str | None] = mapped_column(String(255), nullable=True)
    inicia_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expira_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    profesionales: Mapped[list["AfiliacionProfesional"]] = relationship(back_populates="afiliacion", cascade="all, delete-orphan")

class AfiliacionProfesional(Base):
    __tablename__ = "afiliaciones_profesionales"
    id: Mapped[int] = mapped_column(primary_key=True)
    afiliacion_id: Mapped[int] = mapped_column(ForeignKey("afiliaciones_medicas.id", ondelete="CASCADE"), nullable=False, index=True)
    profesional_id: Mapped[int] = mapped_column(ForeignKey("profesionales_salud.id"), nullable=False, index=True)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    afiliacion: Mapped[AfiliacionMedica] = relationship(back_populates="profesionales")
    profesional: Mapped["ProfesionalSalud"] = relationship()
