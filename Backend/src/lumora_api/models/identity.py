from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from lumora_api.db.base import Base


class SoftDeleteMixin:
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )


class Persona(SoftDeleteMixin, Base):
    __tablename__ = "personas"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombres: Mapped[str] = mapped_column(String(100))
    apellidos: Mapped[str] = mapped_column(String(100))
    fecha_nacimiento: Mapped[date | None] = mapped_column(Date, nullable=True)
    telefono: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    profile_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sexo_id: Mapped[int | None] = mapped_column(ForeignKey("sexos.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    direcciones: Mapped[list["Direccion"]] = relationship(
        back_populates="persona", lazy="selectin"
    )
    usuario: Mapped["Usuario | None"] = relationship(back_populates="persona")
    paciente: Mapped["Paciente | None"] = relationship(back_populates="persona")
    profesional: Mapped["ProfesionalSalud | None"] = relationship(back_populates="persona")


class Usuario(SoftDeleteMixin, Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    persona_id: Mapped[int] = mapped_column(ForeignKey("personas.id"), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    activo: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    email_verificado: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    persona: Mapped[Persona] = relationship(back_populates="usuario", lazy="selectin")
    roles: Mapped[list["Rol"]] = relationship(
        secondary="usuario_roles", back_populates="usuarios", lazy="selectin"
    )

    @property
    def full_name(self) -> str:
        return " ".join(filter(None, (self.persona.nombres, self.persona.apellidos)))


class Paciente(SoftDeleteMixin, Base):
    __tablename__ = "pacientes"

    id: Mapped[int] = mapped_column(primary_key=True)
    persona_id: Mapped[int] = mapped_column(ForeignKey("personas.id"), unique=True, index=True)
    tipo_sangre_id: Mapped[int | None] = mapped_column(
        ForeignKey("tipos_sangre.id"), nullable=True
    )
    alergias: Mapped[str | None] = mapped_column(Text, nullable=True)
    persona: Mapped[Persona] = relationship(back_populates="paciente", lazy="selectin")
    contactos_emergencia: Mapped[list["ContactoEmergencia"]] = relationship(
        back_populates="paciente", lazy="selectin"
    )


class ProfesionalSalud(SoftDeleteMixin, Base):
    __tablename__ = "profesionales_salud"

    id: Mapped[int] = mapped_column(primary_key=True)
    persona_id: Mapped[int] = mapped_column(ForeignKey("personas.id"), unique=True, index=True)
    especialidad: Mapped[str] = mapped_column(String(100))
    numero_licencia: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    persona: Mapped[Persona] = relationship(back_populates="profesional", lazy="selectin")

    @property
    def full_name(self) -> str:
        return " ".join(filter(None, (self.persona.nombres, self.persona.apellidos)))

    @property
    def specialty(self) -> str:
        return self.especialidad

    @property
    def profile_image_url(self) -> str | None:
        return self.persona.profile_image_url if self.persona else None


class ContactoEmergencia(SoftDeleteMixin, Base):
    __tablename__ = "contactos_emergencia"

    id: Mapped[int] = mapped_column(primary_key=True)
    paciente_id: Mapped[int] = mapped_column(ForeignKey("pacientes.id"), index=True)
    nombre: Mapped[str] = mapped_column(String(150))
    parentesco: Mapped[str] = mapped_column(String(50))
    telefono: Mapped[str] = mapped_column(String(30))
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    paciente: Mapped[Paciente] = relationship(back_populates="contactos_emergencia")


class Direccion(SoftDeleteMixin, Base):
    __tablename__ = "direcciones"

    id: Mapped[int] = mapped_column(primary_key=True)
    persona_id: Mapped[int] = mapped_column(ForeignKey("personas.id"), index=True)
    linea_1: Mapped[str] = mapped_column(String(200))
    ciudad: Mapped[str] = mapped_column(String(100))
    departamento: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pais: Mapped[str] = mapped_column(String(100), default="Nicaragua")
    codigo_postal: Mapped[str | None] = mapped_column(String(20), nullable=True)
    es_principal: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    persona: Mapped[Persona] = relationship(back_populates="direcciones")
