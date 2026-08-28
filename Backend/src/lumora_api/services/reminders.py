from datetime import datetime
from typing import List, Sequence
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from lumora_api.repositories.patient_access_repository import PatientAccessRepository
from lumora_api.repositories.reminders import ReminderRepository
from lumora_api.models.reminders import Recordatorio, Notificacion, PreferenciaNotificacion, RelacionPaciente
from lumora_api.schemas.reminders import (
    RecordatorioCreate,
    RecordatorioUpdate,
    NotificacionResponse,
    PreferenciaNotificacionUpdate,
    RelacionPacienteCreate,
)


def _tipo_notificacion(notificacion: Notificacion) -> str:
    """A09: deriva el tipo (alerta/recordatorio/cita/sistema) mirando cuál
    de los 3 campos de origen tiene el Recordatorio asociado. Nunca se
    calcula en el frontend -- ver checklist "No inventar diagnóstico/
    recomendaciones en frontend"."""
    recordatorio = notificacion.recordatorio
    if recordatorio is None:
        return "sistema"
    if recordatorio.alerta_id is not None:
        return "alerta"
    if recordatorio.cita_id is not None:
        return "cita"
    if recordatorio.horario_medicamento_id is not None:
        return "recordatorio"
    return "sistema"


def _to_notificacion_response(notificacion: Notificacion) -> NotificacionResponse:
    return NotificacionResponse(
        id=notificacion.id,
        usuario_id=notificacion.usuario_id,
        recordatorio_id=notificacion.recordatorio_id,
        titulo=notificacion.titulo,
        mensaje=notificacion.mensaje,
        canal=notificacion.canal,
        tipo=_tipo_notificacion(notificacion),
        enviado=notificacion.enviado,
        fecha_envio=notificacion.fecha_envio,
        leido=notificacion.leido,
        fecha_lectura=notificacion.fecha_lectura,
        creado_en=notificacion.creado_en,
    )


class ReminderService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = ReminderRepository(session)

    # Recordatorios
    async def crear_recordatorio(self, data: RecordatorioCreate) -> Recordatorio:
        obj = Recordatorio(**data.model_dump())
        return await self.repo.create_recordatorio(obj)

    async def obtener_recordatorios_paciente(self, paciente_id: int) -> Sequence[Recordatorio]:
        return await self.repo.get_recordatorios_by_paciente(paciente_id)

    async def obtener_recordatorio_por_id(self, id: int) -> Recordatorio:
        rec = await self.repo.get_recordatorio_by_id(id)
        if not rec:
            raise HTTPException(status_code=404, detail="Recordatorio no encontrado")
        return rec

    async def actualizar_recordatorio(self, id: int, data: RecordatorioUpdate) -> Recordatorio:
        rec = await self.obtener_recordatorio_por_id(id)
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(rec, key, value)
        return await self.repo.update_recordatorio(rec)

    async def eliminar_recordatorio(self, id: int) -> None:
        rec = await self.obtener_recordatorio_por_id(id)
        await self.repo.delete_recordatorio(rec)

    # Notificaciones
    async def obtener_notificaciones_usuario(self, usuario_id: int) -> List[NotificacionResponse]:
        notificaciones = await self.repo.get_notificaciones_by_usuario(usuario_id)
        return [_to_notificacion_response(n) for n in notificaciones]

    async def obtener_notificaciones_paciente(self, paciente_id: int) -> List[NotificacionResponse]:
        # A09: resuelve paciente -> persona -> usuario (comparten
        # persona_id, igual que en PatientAccessService) para que un
        # cuidador pueda consultar por el paciente activo, no por su
        # propio usuario_id.
        usuario_id = await PatientAccessRepository(self.session).user_id_for_patient(paciente_id)
        if usuario_id is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El paciente no tiene una cuenta de usuario asociada",
            )
        return await self.obtener_notificaciones_usuario(usuario_id)

    async def obtener_notificacion_por_id(self, id: int) -> Notificacion:
        notif = await self.repo.get_notificacion_by_id(id)
        if not notif:
            raise HTTPException(status_code=404, detail="Notificación no encontrada")
        return notif

    async def marcar_notificacion_leida(self, id: int) -> NotificacionResponse:
        notif = await self.obtener_notificacion_por_id(id)
        notif.leido = True
        notif.fecha_lectura = datetime.now()
        actualizada = await self.repo.update_notificacion(notif)
        return _to_notificacion_response(actualizada)

    # Preferencias
    async def obtener_preferencias(self, usuario_id: int) -> PreferenciaNotificacion:
        pref = await self.repo.get_preferencias(usuario_id)
        if not pref:
            raise HTTPException(status_code=404, detail="Preferencias no encontradas")
        return pref

    async def actualizar_preferencias(self, usuario_id: int, data: PreferenciaNotificacionUpdate) -> PreferenciaNotificacion:
        pref = await self.repo.get_preferencias(usuario_id)
        if not pref:
            pref = PreferenciaNotificacion(usuario_id=usuario_id, **data.model_dump())
        else:
            for key, value in data.model_dump().items():
                setattr(pref, key, value)
        return await self.repo.upsert_preferencias(pref)

    # Relaciones
    async def crear_relacion_paciente(self, data: RelacionPacienteCreate) -> RelacionPaciente:
        obj = RelacionPaciente(**data.model_dump())
        return await self.repo.create_relacion(obj)

    async def obtener_relaciones_paciente(self, paciente_id: int) -> Sequence[RelacionPaciente]:
        return await self.repo.get_relaciones_by_paciente(paciente_id)
