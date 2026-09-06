from datetime import datetime, time
import uuid

from sqlalchemy import ForeignKey, Time, DateTime, Text, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from lumora_api.db.base import Base


class HorarioMedicamento(Base):
    __tablename__ = "horarios_medicamento"
    __table_args__ = (
        UniqueConstraint("detalle_receta_id", "hora", name="uq_detalle_hora"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    detalle_receta_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("detalles_receta.id", ondelete="CASCADE"),
        nullable=False,
    )
    hora: Mapped[time] = mapped_column(Time, nullable=False)
    activo: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    # Relaciones
    dosis: Mapped[list["DosisAdministrada"]] = relationship(
        "DosisAdministrada", back_populates="horario", cascade="all, delete-orphan"
    )


class DosisAdministrada(Base):
    __tablename__ = "dosis_administradas"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    horario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("horarios_medicamento.id", ondelete="CASCADE"),
        nullable=False,
    )
    estado_dosis_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("estados_dosis.id"), nullable=False
    )
    fecha_programada: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    fecha_registro: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    responsable_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("usuarios.id"), nullable=False
    )
    origen_registro_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("origenes_registro.id"), nullable=False
    )
    observaciones: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relaciones
    horario: Mapped["HorarioMedicamento"] = relationship(
        "HorarioMedicamento", back_populates="dosis"
    )