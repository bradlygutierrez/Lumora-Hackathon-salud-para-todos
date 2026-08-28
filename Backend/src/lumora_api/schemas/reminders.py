from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict


# --- RECORDATORIOS ---
class RecordatorioBase(BaseModel):
    paciente_id: int
    tipo_recordatorio_id: int
    horario_medicamento_id: Optional[int] = None
    cita_id: Optional[int] = None
    alerta_id: Optional[int] = None
    titulo: str
    mensaje: str
    fecha_programada: datetime
    activo: bool = True


class RecordatorioCreate(RecordatorioBase):
    pass


class RecordatorioUpdate(BaseModel):
    titulo: Optional[str] = None
    mensaje: Optional[str] = None
    fecha_programada: Optional[datetime] = None
    activo: Optional[bool] = None


class RecordatorioResponse(RecordatorioBase):
    id: int
    creado_en: datetime

    model_config = ConfigDict(from_attributes=True)


# --- NOTIFICACIONES ---
class NotificacionBase(BaseModel):
    usuario_id: int
    recordatorio_id: Optional[int] = None
    titulo: str
    mensaje: str
    canal: str = "APP"


class NotificacionCreate(NotificacionBase):
    pass


class NotificacionResponse(NotificacionBase):
    id: int
    enviado: bool
    fecha_envio: Optional[datetime] = None
    leido: bool
    fecha_lectura: Optional[datetime] = None
    creado_en: datetime

    model_config = ConfigDict(from_attributes=True)


# --- PREFERENCIAS DE NOTIFICACIÓN ---
class PreferenciaNotificacionBase(BaseModel):
    notificar_dosis: bool = True
    notificar_citas: bool = True
    notificar_alertas: bool = True
    permitir_email: bool = True
    permitir_push: bool = True


class PreferenciaNotificacionUpdate(PreferenciaNotificacionBase):
    pass


class PreferenciaNotificacionResponse(PreferenciaNotificacionBase):
    id: int
    usuario_id: int
    modificado_en: datetime

    model_config = ConfigDict(from_attributes=True)


# --- RELACIONES PACIENTE ---
class RelacionPacienteBase(BaseModel):
    paciente_id: int
    usuario_relacionado_id: int
    tipo_relacion_id: int
    recibir_notificaciones: bool = True
    activo: bool = True
    estado: Literal["pending", "active", "revoked", "inactive", "rejected"] = "active"
    nivel_acceso: Literal["read", "write"] = "read"
    expira_en: Optional[datetime] = None


class RelacionPacienteCreate(RelacionPacienteBase):
    pass


class RelacionPacienteResponse(RelacionPacienteBase):
    id: int
    creado_en: datetime

    model_config = ConfigDict(from_attributes=True)
