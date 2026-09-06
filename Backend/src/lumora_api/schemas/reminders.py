from datetime import datetime, time, timezone
from typing import Literal, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, field_serializer, field_validator

ESTADOS_RECORDATORIO = Literal["pendiente", "pospuesto", "completado", "omitido"]


def _naive_utc(value: datetime) -> datetime:
    """Normaliza un datetime que puede llegar con zona horaria (el
    frontend manda `.toISOString()`, que incluye 'Z'/UTC) al formato
    naive que esperan las columnas `DateTime` (sin timezone) de
    Recordatorio -- si no se hace esto, asyncpg truena al insertar con
    "can't subtract offset-naive and offset-aware datetimes"."""
    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


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

    # BUGFIX: el frontend manda fecha_programada como ISO con 'Z' (UTC),
    # Pydantic la parsea como datetime "aware" -- pero la columna en la
    # base de datos es DateTime sin timezone. Sin esto, el INSERT falla
    # con asyncpg.exceptions.DataError ("can't subtract offset-naive and
    # offset-aware datetimes").
    @field_validator("fecha_programada", mode="after")
    @classmethod
    def _fecha_programada_naive(cls, value: datetime) -> datetime:
        return _naive_utc(value)


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
    # Editar un recordatorio de "Seguimiento" existente (pantalla "Nuevo
    # Recordatorio" en modo edición) también puede cambiar su objetivo/unidad.
    objetivo_cantidad: Optional[float] = None
    unidad: Optional[str] = None
    # A10: reemplaza POR COMPLETO las horas del dia del recordatorio (ej.
    # cambiar de [08:00, 20:00] a [08:00, 12:00, 16:00, 20:00]) -- None
    # significa "no tocar los horarios", no "vaciarlos" (por eso es
    # Optional y no una lista vacia por default). Ver
    # ReminderService.actualizar_recordatorio.
    horarios: Optional[list[RecordatorioHorarioCreate]] = None

    # Mismo BUGFIX que RecordatorioBase.fecha_programada -- si se edita la
    # hora, también puede llegar con zona horaria.
    @field_validator("fecha_programada", mode="after")
    @classmethod
    def _fecha_programada_naive(cls, value: Optional[datetime]) -> Optional[datetime]:
        return _naive_utc(value) if value is not None else value


class RecordatorioPosponer(BaseModel):
    nueva_fecha_programada: datetime

    # Mismo BUGFIX que RecordatorioBase.fecha_programada -- este valor
    # también termina escrito en la columna DateTime sin timezone.
    @field_validator("nueva_fecha_programada", mode="after")
    @classmethod
    def _nueva_fecha_programada_naive(cls, value: datetime) -> datetime:
        return _naive_utc(value)


class RecordatorioResponse(RecordatorioBase):
    id: int
    estado: ESTADOS_RECORDATORIO
    creado_en: datetime
    # A10: horas del dia elegidas para este recordatorio (ej. Beber Agua
    # a las 08:00/12:00/16:00/20:00) -- vacia en recordatorios de Rutina
    # simple (una sola `fecha_programada`) o en recordatorios viejos
    # creados antes de este feature.
    horarios: list[RecordatorioHorarioResponse] = []

    model_config = ConfigDict(from_attributes=True)

    # BUGFIX: la columna `fecha_programada` es DateTime SIN zona horaria
    # -- el valor que se guarda ya esta normalizado a UTC (ver
    # _naive_utc), pero al no tener tzinfo, Pydantic lo serializa sin
    # 'Z'/offset (ej. "2026-08-30T21:00:00"). El frontend hace
    # `new Date(...)`, y un ISO string SIN zona se interpreta como hora
    # LOCAL, no UTC -- eso corria la hora mostrada por el offset del
    # dispositivo (ej. 15:00 se mostraba como 21:00 en Nicaragua,
    # UTC-6). Con esto se le pone explicitamente el 'Z' antes de
    # mandarlo para que el frontend lo interprete bien.
    @field_serializer("fecha_programada", when_used="json")
    def _serialize_fecha_programada(self, value: datetime) -> str:
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()


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
    # A15/B15 -- independiente de nivel_acceso: si es false, el cuidador no
    # puede ver ni descargar el expediente medico documental.
    puede_ver_expediente: bool = True
    activo: bool = True
    estado: Literal["pending", "active", "revoked", "inactive", "rejected"] = "active"
    nivel_acceso: Literal["read", "write"] = "read"
    expira_en: Optional[datetime] = None


class RelacionPacienteCreate(RelacionPacienteBase):
    pass


class RelacionPacienteUpdate(BaseModel):
    nivel_acceso: Optional[Literal["read", "write"]] = None
    recibir_notificaciones: Optional[bool] = None
    puede_ver_expediente: Optional[bool] = None
    estado: Optional[Literal["pending", "active", "revoked", "inactive", "rejected"]] = None


class UsuarioRelacionadoSummary(BaseModel):
    id: int
    full_name: str
    email: str

    model_config = ConfigDict(from_attributes=True)


class TipoRelacionSummary(BaseModel):
    id: int
    nombre: str

    model_config = ConfigDict(from_attributes=True)


class RelacionPacienteResponse(RelacionPacienteBase):
    id: int
    creado_en: datetime
    usuario_relacionado: Optional[UsuarioRelacionadoSummary] = None
    tipo_relacion: Optional[TipoRelacionSummary] = None

    model_config = ConfigDict(from_attributes=True)
