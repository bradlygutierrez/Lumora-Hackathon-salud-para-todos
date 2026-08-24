from datetime import datetime
from typing import Optional
from sqlalchemy import String, ForeignKey, Boolean, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from lumora_api.db.base import Base


class Recordatorio(Base):
    __tablename__ = "recordatorios"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    paciente_id: Mapped[int] = mapped_column(ForeignKey("pacientes.id"), nullable=False)
    tipo_recordatorio_id: Mapped[int] = mapped_column(ForeignKey("tipos_recordatorio.id"), nullable=False)
    
    # Entidades de origen opcionales (A03, B05, A04)
    horario_medicamento_id: Mapped[Optional[int]] = mapped_column(ForeignKey("horarios_medicamento.id"), nullable=True)
    cita_id: Mapped[Optional[int]] = mapped_column(ForeignKey("citas.id"), nullable=True)
    alerta_id: Mapped[Optional[int]] = mapped_column(ForeignKey("alertas_clinicas.id"), nullable=True)

    titulo: Mapped[str] = mapped_column(String(150), nullable=False)
    mensaje: Mapped[str] = mapped_column(Text, nullable=False)
    fecha_programada: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Notificacion(Base):
    __tablename__ = "notificaciones"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    recordatorio_id: Mapped[Optional[int]] = mapped_column(ForeignKey("recordatorios.id"), nullable=True)
    
    titulo: Mapped[str] = mapped_column(String(150), nullable=False)
    mensaje: Mapped[str] = mapped_column(Text, nullable=False)
    canal: Mapped[str] = mapped_column(String(50), default="APP")
    enviado: Mapped[bool] = mapped_column(Boolean, default=False)
    fecha_envio: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    leido: Mapped[bool] = mapped_column(Boolean, default=False)
    fecha_lectura: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PreferenciaNotificacion(Base):
    __tablename__ = "preferencias_notificacion"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), unique=True, nullable=False)
    
    notificar_dosis: Mapped[bool] = mapped_column(Boolean, default=True)
    notificar_citas: Mapped[bool] = mapped_column(Boolean, default=True)
    notificar_alertas: Mapped[bool] = mapped_column(Boolean, default=True)
    permitir_email: Mapped[bool] = mapped_column(Boolean, default=True)
    permitir_push: Mapped[bool] = mapped_column(Boolean, default=True)
    modificado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RelacionPaciente(Base):
    __tablename__ = "relaciones_paciente"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    paciente_id: Mapped[int] = mapped_column(ForeignKey("pacientes.id"), nullable=False)
    usuario_relacionado_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    tipo_relacion_id: Mapped[int] = mapped_column(ForeignKey("tipos_relacion.id"), nullable=False)
    
    recibir_notificaciones: Mapped[bool] = mapped_column(Boolean, default=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)