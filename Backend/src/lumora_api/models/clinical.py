from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from lumora_api.db.base import Base
from lumora_api.models.identity import SoftDeleteMixin


class Expediente(SoftDeleteMixin, Base):
    __tablename__ = "expedientes"
    __table_args__ = (
        Index(
            "uq_expedientes_paciente_activo",
            "paciente_id",
            unique=True,
            sqlite_where=text("activo = 1 AND deleted_at IS NULL"),
            postgresql_where=text("activo = true AND deleted_at IS NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    paciente_id: Mapped[int] = mapped_column(ForeignKey("pacientes.id"), index=True)
    estado_expediente_id: Mapped[int] = mapped_column(
        ForeignKey("estados_expediente.id"), index=True
    )
    numero_expediente: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    paciente: Mapped["Paciente"] = relationship(lazy="selectin")
    antecedentes: Mapped[list["AntecedenteMedico"]] = relationship(
        back_populates="expediente", lazy="selectin"
    )


class AntecedenteMedico(SoftDeleteMixin, Base):
    __tablename__ = "antecedentes_medicos"

    id: Mapped[int] = mapped_column(primary_key=True)
    expediente_id: Mapped[int] = mapped_column(ForeignKey("expedientes.id"), index=True)
    tipo_antecedente_id: Mapped[int] = mapped_column(
        ForeignKey("tipos_antecedente.id"), index=True
    )
    descripcion: Mapped[str] = mapped_column(String(300))
    fecha: Mapped[date | None] = mapped_column(Date, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    expediente: Mapped[Expediente] = relationship(back_populates="antecedentes")


class Alergia(SoftDeleteMixin, Base):
    __tablename__ = "alergias_clinicas"

    id: Mapped[int] = mapped_column(primary_key=True)
    paciente_id: Mapped[int] = mapped_column(ForeignKey("pacientes.id"), index=True)
    nombre: Mapped[str] = mapped_column(String(180))
    nivel_severidad_id: Mapped[int | None] = mapped_column(
        ForeignKey("niveles_severidad.id"), nullable=True, index=True
    )
    estado_condicion_id: Mapped[int | None] = mapped_column(
        ForeignKey("estados_condicion.id"), nullable=True, index=True
    )
    observaciones: Mapped[str | None] = mapped_column(Text, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")


class Discapacidad(SoftDeleteMixin, Base):
    __tablename__ = "discapacidades"

    id: Mapped[int] = mapped_column(primary_key=True)
    paciente_id: Mapped[int] = mapped_column(ForeignKey("pacientes.id"), index=True)
    nombre: Mapped[str] = mapped_column(String(180))
    estado_condicion_id: Mapped[int | None] = mapped_column(
        ForeignKey("estados_condicion.id"), nullable=True, index=True
    )
    observaciones: Mapped[str | None] = mapped_column(Text, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
