from datetime import datetime

from datetime import time

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, Time, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from lumora_api.db.base import Base


class Cita(Base):
    __tablename__ = "citas"

    id: Mapped[int] = mapped_column(primary_key=True)
    paciente_id: Mapped[int] = mapped_column(ForeignKey("pacientes.id"), index=True)
    profesional_id: Mapped[int] = mapped_column(ForeignKey("profesionales_salud.id"), index=True)
    professional: Mapped["ProfesionalSalud"] = relationship(
        "ProfesionalSalud", foreign_keys=[profesional_id], lazy="noload"
    )
    tipo_cita_id: Mapped[int | None] = mapped_column(ForeignKey("tipos_cita.id"), nullable=True)
    appointment_type: Mapped["TipoCita | None"] = relationship("TipoCita", lazy="noload")
    estado_cita_id: Mapped[int | None] = mapped_column(ForeignKey("estados_cita.id"), nullable=True)
    status: Mapped["EstadoCita | None"] = relationship("EstadoCita", lazy="noload")
    ubicacion_id: Mapped[int | None] = mapped_column(ForeignKey("ubicaciones_atencion.id"), nullable=True, index=True)
    location: Mapped["UbicacionAtencion | None"] = relationship("UbicacionAtencion", lazy="noload")
    inicio: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    fin: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class HorarioProfesional(Base):
    __tablename__ = "horarios_profesionales"
    id: Mapped[int] = mapped_column(primary_key=True)
    profesional_id: Mapped[int] = mapped_column(ForeignKey("profesionales_salud.id"), index=True)
    dia_semana: Mapped[int] = mapped_column(Integer)
    hora_inicio: Mapped[time] = mapped_column(Time, nullable=False)
    hora_fin: Mapped[time] = mapped_column(Time, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")


class UbicacionAtencion(Base):
    __tablename__ = "ubicaciones_atencion"
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    direccion: Mapped[str] = mapped_column(String(500), nullable=False)
    consultorio: Mapped[str | None] = mapped_column(String(100), nullable=True)
    latitud: Mapped[float | None] = mapped_column(nullable=True)
    longitud: Mapped[float | None] = mapped_column(nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")


class EventoAuditoria(Base):
    __tablename__ = "eventos_auditoria"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), index=True)
    accion: Mapped[str] = mapped_column(String(10), index=True)
    entidad: Mapped[str] = mapped_column(String(100), index=True)
    entidad_id: Mapped[int] = mapped_column(index=True)
    datos_anteriores: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    datos_nuevos: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
