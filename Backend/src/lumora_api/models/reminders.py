import uuid
from datetime import datetime, time
from typing import TYPE_CHECKING, Optional
from sqlalchemy import String, ForeignKey, Boolean, DateTime, Text, Float, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from lumora_api.db.base import Base

if TYPE_CHECKING:
    from lumora_api.models.catalogs import TipoRelacion
    from lumora_api.models.identity import Paciente, Usuario


class Recordatorio(Base):
    __tablename__ = "recordatorios"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    paciente_id: Mapped[int] = mapped_column(ForeignKey("pacientes.id"), nullable=False)
    tipo_recordatorio_id: Mapped[int] = mapped_column(ForeignKey("tipos_recordatorio.id"), nullable=False)
    
    # Entidades de origen opcionales (A03, B05, A04)
    # BUGFIX: horario_medicamento_id y alerta_id son UUID en sus tablas
    # de origen (HorarioMedicamento.id, AlertaClinica.id) -- declararlos
    # como int aca causaba ResponseValidationError (500) en cualquier
    # GET que trajera un Recordatorio generado a partir de una dosis
    # omitida o una alerta clinica (ver A09 _generar_notificaciones_*).
    horario_medicamento_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("horarios_medicamento.id"), nullable=True
    )
    cita_id: Mapped[Optional[int]] = mapped_column(ForeignKey("citas.id"), nullable=True)
    alerta_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("alertas_clinicas.id"), nullable=True
    )

    titulo: Mapped[str] = mapped_column(String(150), nullable=False)
    mensaje: Mapped[str] = mapped_column(Text, nullable=False)
    fecha_programada: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Estado del recordatorio: pendiente -> pospuesto/completado/omitido.
    # Ver POST /recordatorios/{id}/posponer y /recordatorios/{id}/omitir
    # (botones "Posponer"/"Omitir" de la pantalla de Recordatorios).
    estado: Mapped[str] = mapped_column(
        String(20), default="pendiente", server_default="pendiente", nullable=False
    )

    # A10: solo se usan cuando tipo_recordatorio es "Seguimiento" (sin
    # horario_medicamento_id/cita_id/alerta_id) -- p.ej. "Beber Agua" con
    # objetivo_cantidad=2.0, unidad="Litros", progreso_actual empezando en
    # 0.0 e incrementandose via PATCH /recordatorios/{id}.
    objetivo_cantidad: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    progreso_actual: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    unidad: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    # Horas del dia elegidas por quien crea el recordatorio para repartir
    # objetivo_cantidad (ej. "Beber Agua": 2 Litros repartidos en
    # 08:00/12:00/16:00/20:00, ver RecordatorioHorario mas abajo).
    horarios: Mapped[list["RecordatorioHorario"]] = relationship(
        back_populates="recordatorio",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="RecordatorioHorario.hora",
    )


class RecordatorioHorario(Base):
    __tablename__ = "recordatorio_horarios"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    recordatorio_id: Mapped[int] = mapped_column(
        ForeignKey("recordatorios.id", ondelete="CASCADE"), nullable=False
    )
    hora: Mapped[time] = mapped_column(Time, nullable=False)
    # Porcion del objetivo_cantidad del recordatorio que corresponde a
    # este horario puntual. Si es None, se reparte en partes iguales
    # entre los horarios activos (calculado en ReminderService).
    cantidad_objetivo: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    recordatorio: Mapped["Recordatorio"] = relationship(back_populates="horarios")


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

    # A09: permite derivar el "tipo" de notificacion (alerta/recordatorio/
    # cita/sistema) mirando el origen del Recordatorio asociado, sin
    # necesidad de un campo tipo propio ni llamadas N+1 desde el frontend.
    recordatorio: Mapped[Optional["Recordatorio"]] = relationship(lazy="selectin")


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
    # A15/B15 -- permiso independiente de nivel_acceso: si esta en false,
    # el cuidador no puede ver ni descargar el expediente medico
    # documental, sin importar si su nivel_acceso es read o write.
    puede_ver_expediente: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true"
    )
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    estado: Mapped[str] = mapped_column(String(20), default="active", server_default="active", nullable=False)
    nivel_acceso: Mapped[str] = mapped_column(String(20), default="read", server_default="read", nullable=False)
    expira_en: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    paciente: Mapped["Paciente"] = relationship(lazy="selectin")
    usuario_relacionado: Mapped["Usuario"] = relationship(lazy="selectin")
    tipo_relacion: Mapped["TipoRelacion"] = relationship(lazy="selectin")
