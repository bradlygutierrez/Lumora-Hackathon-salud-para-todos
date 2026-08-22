from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from lumora_api.db.base import Base


class Cita(Base):
    __tablename__ = "citas"

    id: Mapped[int] = mapped_column(primary_key=True)
    paciente_id: Mapped[int] = mapped_column(ForeignKey("pacientes.id"), index=True)
    profesional_id: Mapped[int] = mapped_column(ForeignKey("profesionales_salud.id"), index=True)
    tipo_cita_id: Mapped[int | None] = mapped_column(ForeignKey("tipos_cita.id"), nullable=True)
    estado_cita_id: Mapped[int | None] = mapped_column(ForeignKey("estados_cita.id"), nullable=True)
    inicio: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    fin: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


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
