import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional, List
from sqlalchemy import String, ForeignKey, Integer, Text, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from lumora_api.db.base import Base

if TYPE_CHECKING:
    from lumora_api.models.identity import Paciente, ProfesionalSalud
    from lumora_api.models.clinical import ConsultaMedica
    from lumora_api.models.catalogs import UnidadMedida, ViaAdministracion, EstadoReceta


class Medicamento(Base):
    __tablename__ = "medicamentos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    nombre: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    nombre_generico: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    presentacion: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    concentracion: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    fabricante: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    detalles: Mapped[List["DetalleReceta"]] = relationship("DetalleReceta", back_populates="medicamento")


class Receta(Base):
    __tablename__ = "recetas"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    paciente_id: Mapped[int] = mapped_column(Integer, ForeignKey("pacientes.id"), nullable=False, index=True)
    profesional_id: Mapped[int] = mapped_column(Integer, ForeignKey("profesionales_salud.id"), nullable=False, index=True)
    consulta_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("consultas_medicas.id"), nullable=True, index=True)
    estado_id: Mapped[int] = mapped_column(Integer, ForeignKey("estados_receta.id"), nullable=False, default=1)

    titulo: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

    fecha_emision: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    vigencia_hasta: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    observaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relaciones
    paciente: Mapped["Paciente"] = relationship("Paciente")
    # lazy="selectin": RecetaResponse anida los datos del profesional (nombre,
    # especialidad) directamente en la respuesta, y SQLAlchemy async no puede
    # hacer lazy-load "select" normal fuera de un contexto sync: sin esto,
    # serializar `receta.profesional` en la respuesta lanzaría MissingGreenlet.
    profesional: Mapped["ProfesionalSalud"] = relationship("ProfesionalSalud", lazy="selectin")
    consulta: Mapped[Optional["ConsultaMedica"]] = relationship("ConsultaMedica")
    estado: Mapped["EstadoReceta"] = relationship("EstadoReceta")
    detalles: Mapped[List["DetalleReceta"]] = relationship("DetalleReceta", back_populates="receta", cascade="all, delete-orphan")

class DetalleReceta(Base):
    __tablename__ = "detalles_receta"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    receta_id: Mapped[str] = mapped_column(String(36), ForeignKey("recetas.id", ondelete="CASCADE"), nullable=False, index=True)
    medicamento_id: Mapped[str] = mapped_column(String(36), ForeignKey("medicamentos.id"), nullable=False, index=True)
    unidad_medida_id: Mapped[int] = mapped_column(Integer, ForeignKey("unidades_medida.id"), nullable=False)
    via_administracion_id: Mapped[int] = mapped_column(Integer, ForeignKey("vias_administracion.id"), nullable=False)

    dosis: Mapped[str] = mapped_column(String(50), nullable=False)
    frecuencia: Mapped[str] = mapped_column(String(100), nullable=False)
    duracion_dias: Mapped[int] = mapped_column(Integer, nullable=False)
    cantidad_total: Mapped[int] = mapped_column(Integer, nullable=False)
    instrucciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relaciones
    receta: Mapped["Receta"] = relationship("Receta", back_populates="detalles")
    medicamento: Mapped["Medicamento"] = relationship("Medicamento", back_populates="detalles")
    unidad_medida: Mapped["UnidadMedida"] = relationship("UnidadMedida")
    via_administracion: Mapped["ViaAdministracion"] = relationship("ViaAdministracion")
