import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from lumora_api.db.base import Base


class IndicadorMedico(Base):
    __tablename__ = "indicadores_medicos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    nombre = Column(String(100), nullable=False)
    unidad_medida_id = Column(Integer, ForeignKey("unidades_medida.id"), nullable=False)
    descripcion = Column(Text, nullable=True)
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    rangos = relationship("RangoIndicador", back_populates="indicador", cascade="all, delete-orphan")
    mediciones = relationship("MedicionIndicador", back_populates="indicador")


class RangoIndicador(Base):
    __tablename__ = "rangos_indicador"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    indicador_id = Column(UUID(as_uuid=True), ForeignKey("indicadores_medicos.id"), nullable=False)
    nivel_severidad_id = Column(Integer, ForeignKey("niveles_severidad.id"), nullable=False)
    valor_minimo = Column(Float, nullable=True)
    valor_maximo = Column(Float, nullable=True)
    etiqueta = Column(String(50), nullable=False)
    activo = Column(Boolean, default=True, nullable=False)

    indicador = relationship("IndicadorMedico", back_populates="rangos")


class MedicionIndicador(Base):
    __tablename__ = "mediciones_indicador"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    paciente_id = Column(Integer, ForeignKey("pacientes.id"), nullable=False, index=True)
    indicador_id = Column(UUID(as_uuid=True), ForeignKey("indicadores_medicos.id"), nullable=False)
    valor = Column(Float, nullable=False)
    unidad_medida_id = Column(Integer, ForeignKey("unidades_medida.id"), nullable=False)
    origen_registro_id = Column(Integer, ForeignKey("origenes_registro.id"), nullable=False)
    registrado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)  # CORREGIDO A Integer
    fecha_medicion = Column(DateTime, default=datetime.utcnow, nullable=False)
    observaciones = Column(Text, nullable=True)

    indicador = relationship("IndicadorMedico", back_populates="mediciones")
    alertas = relationship("AlertaClinica", back_populates="medicion")


class AlertaClinica(Base):
    __tablename__ = "alertas_clinicas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    paciente_id = Column(Integer, ForeignKey("pacientes.id"), nullable=False, index=True)
    medicion_id = Column(UUID(as_uuid=True), ForeignKey("mediciones_indicador.id"), nullable=False)
    nivel_severidad_id = Column(Integer, ForeignKey("niveles_severidad.id"), nullable=False)
    tipo_alerta_id = Column(Integer, ForeignKey("tipos_alerta.id"), nullable=False)
    origen_registro_id = Column(Integer, ForeignKey("origenes_registro.id"), nullable=False)
    mensaje = Column(Text, nullable=False)
    atendida = Column(Boolean, default=False, nullable=False)
    atendida_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)  # CORREGIDO A Integer
    fecha_alerta = Column(DateTime, default=datetime.utcnow, nullable=False)
    fecha_atencion = Column(DateTime, nullable=True)

    medicion = relationship("MedicionIndicador", back_populates="alertas")