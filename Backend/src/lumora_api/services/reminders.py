from datetime import datetime
from typing import Sequence
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from lumora_api.repositories.reminders import ReminderRepository
from lumora_api.models.reminders import Recordatorio, Notificacion, PreferenciaNotificacion, RelacionPaciente
from lumora_api.schemas.reminders import (
    RecordatorioCreate,
    RecordatorioUpdate,
    PreferenciaNotificacionUpdate,
    RelacionPacienteCreate,
)

class ReminderService:
    def __init__(self, session: AsyncSession):
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
    async def obtener_notificaciones_usuario(self, usuario_id: int) -> Sequence[Notificacion]:
        return await self.repo.get_notificaciones_by_usuario(usuario_id)

    async def marcar_notificacion_leida(self, id: int) -> Notificacion:
        notif = await self.repo.get_notificacion_by_id(id)
        if not notif:
            raise HTTPException(status_code=404, detail="Notificación no encontrada")
        notif.leido = True
        notif.fecha_lectura = datetime.now()
        return await self.repo.update_notificacion(notif)

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