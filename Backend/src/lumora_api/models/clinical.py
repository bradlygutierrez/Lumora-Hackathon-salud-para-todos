from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Index, String, Text, func, text
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
    consultas: Mapped[list["ConsultaMedica"]] = relationship(
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


class ConsultaMedica(SoftDeleteMixin, Base):
    __tablename__ = "consultas_medicas"

    id: Mapped[int] = mapped_column(primary_key=True)
    expediente_id: Mapped[int] = mapped_column(ForeignKey("expedientes.id"), index=True)
    paciente_id: Mapped[int] = mapped_column(ForeignKey("pacientes.id"), index=True)
    profesional_id: Mapped[int] = mapped_column(
        ForeignKey("profesionales_salud.id"), index=True
    )
    motivo_consulta_id: Mapped[int | None] = mapped_column(
        ForeignKey("motivos_consulta.id"), nullable=True, index=True
    )
    fecha_consulta: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    motivo: Mapped[str | None] = mapped_column(String(600), nullable=True)
    sintomas: Mapped[str | None] = mapped_column(Text, nullable=True)
    evaluacion: Mapped[str | None] = mapped_column(Text, nullable=True)
    indicaciones: Mapped[str | None] = mapped_column(Text, nullable=True)
    observaciones: Mapped[str | None] = mapped_column(Text, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    expediente: Mapped[Expediente] = relationship(back_populates="consultas")
    signos_vitales: Mapped[list["SignoVital"]] = relationship(
        back_populates="consulta", lazy="selectin"
    )
    notas: Mapped[list["NotaClinica"]] = relationship(
        back_populates="consulta", lazy="selectin"
    )
    diagnosticos: Mapped[list["Diagnostico"]] = relationship(
        back_populates="consulta", lazy="selectin"
    )


class SignoVital(Base):
    __tablename__ = "signos_vitales"

    id: Mapped[int] = mapped_column(primary_key=True)
    consulta_id: Mapped[int] = mapped_column(ForeignKey("consultas_medicas.id"), index=True)
    temperatura_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    frecuencia_cardiaca: Mapped[int | None] = mapped_column(nullable=True)
    frecuencia_respiratoria: Mapped[int | None] = mapped_column(nullable=True)
    presion_sistolica: Mapped[int | None] = mapped_column(nullable=True)
    presion_diastolica: Mapped[int | None] = mapped_column(nullable=True)
    saturacion_oxigeno: Mapped[int | None] = mapped_column(nullable=True)
    peso_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    talla_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    glucosa_mg_dl: Mapped[int | None] = mapped_column(nullable=True)
    registrado_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    consulta: Mapped[ConsultaMedica] = relationship(back_populates="signos_vitales")


class NotaClinica(SoftDeleteMixin, Base):
    __tablename__ = "notas_clinicas"

    id: Mapped[int] = mapped_column(primary_key=True)
    consulta_id: Mapped[int] = mapped_column(ForeignKey("consultas_medicas.id"), index=True)
    autor_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), index=True)
    contenido: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    activo: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    consulta: Mapped[ConsultaMedica] = relationship(back_populates="notas")


class Diagnostico(SoftDeleteMixin, Base):
    __tablename__ = "diagnosticos"

    id: Mapped[int] = mapped_column(primary_key=True)
    consulta_id: Mapped[int] = mapped_column(ForeignKey("consultas_medicas.id"), index=True)
    expediente_id: Mapped[int] = mapped_column(ForeignKey("expedientes.id"), index=True)
    profesional_id: Mapped[int] = mapped_column(
        ForeignKey("profesionales_salud.id"), index=True
    )
    tipo_diagnostico_id: Mapped[int] = mapped_column(
        ForeignKey("tipos_diagnostico.id"), index=True
    )
    descripcion: Mapped[str] = mapped_column(String(700))
    es_principal: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    fecha_diagnostico: Mapped[date] = mapped_column(Date, server_default=func.current_date())
    activo: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    consulta: Mapped[ConsultaMedica] = relationship(back_populates="diagnosticos")


class CondicionMedica(SoftDeleteMixin, Base):
    __tablename__ = "condiciones_medicas"

    id: Mapped[int] = mapped_column(primary_key=True)
    expediente_id: Mapped[int] = mapped_column(ForeignKey("expedientes.id"), index=True)
    paciente_id: Mapped[int] = mapped_column(ForeignKey("pacientes.id"), index=True)
    diagnostico_id: Mapped[int | None] = mapped_column(
        ForeignKey("diagnosticos.id"), nullable=True, index=True
    )
    estado_condicion_id: Mapped[int] = mapped_column(
        ForeignKey("estados_condicion.id"), index=True
    )
    nombre: Mapped[str] = mapped_column(String(180))
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    fecha_inicio: Mapped[date | None] = mapped_column(Date, nullable=True)
    fecha_fin: Mapped[date | None] = mapped_column(Date, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class HistorialCondicion(Base):
    __tablename__ = "historial_condiciones"

    id: Mapped[int] = mapped_column(primary_key=True)
    condicion_id: Mapped[int] = mapped_column(ForeignKey("condiciones_medicas.id"), index=True)
    estado_anterior_id: Mapped[int | None] = mapped_column(
        ForeignKey("estados_condicion.id"), nullable=True
    )
    estado_nuevo_id: Mapped[int | None] = mapped_column(
        ForeignKey("estados_condicion.id"), nullable=True
    )
    accion: Mapped[str] = mapped_column(String(30))
    motivo: Mapped[str | None] = mapped_column(String(300), nullable=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
