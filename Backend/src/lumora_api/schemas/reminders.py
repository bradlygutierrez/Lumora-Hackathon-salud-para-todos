from datetime import datetime, time
from typing import Literal, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict

ESTADOS_RECORDATORIO = Literal["pendiente", "pospuesto", "completado", "omitido"]


# --- HORARIOS DE UN RECORDATORIO (horas del dia elegidas para repartir ---
# --- objetivo_cantidad, ej. "Beber Agua": 2L en 08:00/12:00/16:00/20:00) ---
class RecordatorioHorarioBase(BaseModel):
    hora: time
    # Porcion de objetivo_cantidad para este horario puntual (ej. 0.5
    # Litros a las 08:00). Si se deja en None, se reparte el
    # objetivo_cantidad del recordatorio en partes iguales entre los
    # horarios activos (ver cantidad_efectiva en el response).
    cantidad_objetivo: Optional[float] = None
    activo: bool = True


class RecordatorioHorarioCreate(RecordatorioHorarioBase):
    pass


class RecordatorioHorarioUpdate(BaseModel):
    hora: Optional[time] = None
    cantidad_objetivo: Optional[float] = None
    activo: Optional[bool] = None


class RecordatorioHorarioResponse(RecordatorioHorarioBase):
    id: int
    recordatorio_id: int
    # Cantidad que efectivamente le corresponde a este horario: la
    # cantidad_objetivo explicita si se definio, o si no el reparto
    # equitativo de objetivo_cantidad / horarios activos.
    cantidad_efectiva: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


# --- RECORDATORIOS ---
class RecordatorioBase(BaseModel):
    paciente_id: int
    tipo_recordatorio_id: int
    # BUGFIX: coinciden con los ids UUID de HorarioMedicamento/AlertaClinica
    # (ver models/reminders.py) -- antes declarados como int, causaba
    # ResponseValidationError (500) al listar recordatorios generados
    # a partir de una dosis omitida o una alerta clinica.
    horario_medicamento_id: Optional[UUID] = None
    cita_id: Optional[int] = None
    alerta_id: Optional[UUID] = None
    titulo: str
    mensaje: str
    fecha_programada: datetime
    activo: bool = True
    # A10: solo aplican a recordatorios "Seguimiento" (sin origen de
    # dosis/cita/alerta) -- ver Recordatorio en models/reminders.py.
    objetivo_cantidad: Optional[float] = None
    progreso_actual: Optional[float] = None
    unidad: Optional[str] = None


class RecordatorioCreate(RecordatorioBase):
    # Horas del dia en que se quiere que avise (opcional). Ej. para
    # "Beber agua" con objetivo_cantidad=2 (Litros): [08:00, 12:00,
    # 16:00, 20:00] reparte el objetivo entre esos 4 horarios.
    horarios: list[RecordatorioHorarioCreate] = []


class RecordatorioUpdate(BaseModel):
    titulo: Optional[str] = None
    mensaje: Optional[str] = None
    fecha_programada: Optional[datetime] = None
    activo: Optional[bool] = None
    # A10: para registrar avance de un recordatorio de seguimiento (p.ej.
    # sumar litros bebidos). El frontend manda el valor total nuevo, no un
    # delta -- el backend no calcula sumas.
    progreso_actual: Optional[float] = None


class RecordatorioPosponer(BaseModel):
    nueva_fecha_programada: datetime


class RecordatorioResponse(RecordatorioBase):
    id: int
    estado: ESTADOS_RECORDATORIO
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
    # A09: calculado en el backend a partir del Recordatorio asociado --
    # nunca lo decide el frontend (ver ReminderService._tipo_notificacion).
    tipo: Literal["alerta", "recordatorio", "cita", "sistema"]
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
