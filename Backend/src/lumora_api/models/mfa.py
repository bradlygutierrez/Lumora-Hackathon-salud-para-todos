from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from lumora_api.db.base import Base


class MetodoMfa(Base):
    __tablename__ = "metodos_mfa"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    descripcion: Mapped[str | None] = mapped_column(String(200), nullable=True)


class UsuarioMetodoMfa(Base):
    __tablename__ = "usuario_metodos_mfa"
    __table_args__ = (UniqueConstraint("usuario_id", "metodo_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), index=True)
    metodo_id: Mapped[int] = mapped_column(ForeignKey("metodos_mfa.id"), index=True)
    secreto_cifrado: Mapped[str] = mapped_column(String(500))
    activo: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    disabled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    usuario: Mapped["Usuario"] = relationship()
    metodo: Mapped[MetodoMfa] = relationship(lazy="selectin")
    codigos_recuperacion: Mapped[list["CodigoRecuperacionMfa"]] = relationship(
        back_populates="usuario_metodo", lazy="selectin"
    )


class DesafioAutenticacion(Base):
    __tablename__ = "desafios_autenticacion"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), index=True)
    usuario_metodo_id: Mapped[int] = mapped_column(
        ForeignKey("usuario_metodos_mfa.id"), index=True
    )
    desafio_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    intentos: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    max_intentos: Mapped[int] = mapped_column(Integer, default=5, server_default="5")
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    usuario_metodo: Mapped[UsuarioMetodoMfa] = relationship(lazy="selectin")


class CodigoRecuperacionMfa(Base):
    __tablename__ = "codigos_recuperacion_mfa"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_metodo_id: Mapped[int] = mapped_column(
        ForeignKey("usuario_metodos_mfa.id", ondelete="CASCADE"), index=True
    )
    codigo_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    usuario_metodo: Mapped[UsuarioMetodoMfa] = relationship(
        back_populates="codigos_recuperacion"
    )
