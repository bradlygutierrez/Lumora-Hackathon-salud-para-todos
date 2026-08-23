from typing import Sequence, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from lumora_api.models.reminders import (
    Recordatorio,
    Notificacion,
    PreferenciaNotificacion,
    RelacionPaciente,
)

class ReminderRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    # --- RECORDATORIOS ---
    async def create_recordatorio(self, recordatorio: Recordatorio) -> Recordatorio:
        self.session.add(recordatorio)
        await self.session.commit()
        await self.session.refresh(recordatorio)
        return recordatorio

    async def get_recordatorio_by_id(self, recordatorio_id: int) -> Optional[Recordatorio]:
        stmt = select(Recordatorio).where(Recordatorio.id == recordatorio_id)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def get_recordatorios_by_paciente(self, paciente_id: int) -> Sequence[Recordatorio]:
        stmt = select(Recordatorio).where(Recordatorio.paciente_id == paciente_id)
        res = await self.session.execute(stmt)
        return res.scalars().all()

    async def update_recordatorio(self, recordatorio: Recordatorio) -> Recordatorio:
        await self.session.commit()
        await self.session.refresh(recordatorio)
        return recordatorio

    async def delete_recordatorio(self, recordatorio: Recordatorio) -> None:
        await self.session.delete(recordatorio)
        await self.session.commit()

    # --- NOTIFICACIONES ---
    async def get_notificaciones_by_usuario(self, usuario_id: int) -> Sequence[Notificacion]:
        stmt = select(Notificacion).where(Notificacion.usuario_id == usuario_id)
        res = await self.session.execute(stmt)
        return res.scalars().all()

    async def get_notificacion_by_id(self, notificacion_id: int) -> Optional[Notificacion]:
        stmt = select(Notificacion).where(Notificacion.id == notificacion_id)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def update_notificacion(self, notificacion: Notificacion) -> Notificacion:
        await self.session.commit()
        await self.session.refresh(notificacion)
        return notificacion

    # --- PREFERENCIAS ---
    async def get_preferencias(self, usuario_id: int) -> Optional[PreferenciaNotificacion]:
        stmt = select(PreferenciaNotificacion).where(PreferenciaNotificacion.usuario_id == usuario_id)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def upsert_preferencias(self, pref: PreferenciaNotificacion) -> PreferenciaNotificacion:
        self.session.add(pref)
        await self.session.commit()
        await self.session.refresh(pref)
        return pref

    # --- RELACIONES PACIENTE ---
    async def create_relacion(self, relacion: RelacionPaciente) -> RelacionPaciente:
        self.session.add(relacion)
        await self.session.commit()
        await self.session.refresh(relacion)
        return relacion

    async def get_relaciones_by_paciente(self, paciente_id: int) -> Sequence[RelacionPaciente]:
        stmt = select(RelacionPaciente).where(RelacionPaciente.paciente_id == paciente_id)
        res = await self.session.execute(stmt)
        return res.scalars().all()