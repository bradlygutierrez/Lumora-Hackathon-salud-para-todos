from typing import Sequence, Optional
from datetime import datetime, timezone

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from lumora_api.models.reminders import (
    Recordatorio,
    RecordatorioHorario,
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

    # --- HORARIOS DE RECORDATORIO ---
    async def get_recordatorio_horarios(self, recordatorio_id: int) -> Sequence[RecordatorioHorario]:
        stmt = (
            select(RecordatorioHorario)
            .where(RecordatorioHorario.recordatorio_id == recordatorio_id)
            .order_by(RecordatorioHorario.hora)
        )
        res = await self.session.execute(stmt)
        return res.scalars().all()

    async def get_recordatorio_horario_by_id(self, horario_id: int) -> Optional[RecordatorioHorario]:
        stmt = select(RecordatorioHorario).where(RecordatorioHorario.id == horario_id)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def create_recordatorio_horario(self, horario: RecordatorioHorario) -> RecordatorioHorario:
        self.session.add(horario)
        await self.session.commit()
        await self.session.refresh(horario)
        return horario

    async def update_recordatorio_horario(self, horario: RecordatorioHorario) -> RecordatorioHorario:
        await self.session.commit()
        await self.session.refresh(horario)
        return horario

    async def delete_recordatorio_horario(self, horario: RecordatorioHorario) -> None:
        await self.session.delete(horario)
        await self.session.commit()

    # --- NOTIFICACIONES ---
    async def get_notificaciones_by_usuario(self, usuario_id: int) -> Sequence[Notificacion]:
        # selectinload trae el Recordatorio asociado en la misma consulta
        # (A09: necesario para derivar el "tipo" sin N+1 llamadas).
        stmt = (
            select(Notificacion)
            .options(selectinload(Notificacion.recordatorio))
            .where(Notificacion.usuario_id == usuario_id)
            .order_by(Notificacion.creado_en.desc())
        )
        res = await self.session.execute(stmt)
        return res.scalars().all()

    async def get_notificacion_by_id(self, notificacion_id: int) -> Optional[Notificacion]:
        stmt = (
            select(Notificacion)
            .options(selectinload(Notificacion.recordatorio))
            .where(Notificacion.id == notificacion_id)
        )
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

    async def get_relacion_by_id(self, relacion_id: int) -> RelacionPaciente | None:
        return await self.session.get(RelacionPaciente, relacion_id)

    async def update_relacion(self, relacion: RelacionPaciente) -> RelacionPaciente:
        await self.session.commit()
        await self.session.refresh(relacion)
        return relacion

    async def get_active_relationships_for_caregiver(
        self, usuario_id: int
    ) -> Sequence[RelacionPaciente]:
        now = datetime.now(timezone.utc)
        stmt = (
            select(RelacionPaciente)
            .where(
                RelacionPaciente.usuario_relacionado_id == usuario_id,
                RelacionPaciente.activo.is_(True),
                RelacionPaciente.estado == "active",
                or_(RelacionPaciente.expira_en.is_(None), RelacionPaciente.expira_en > now),
            )
            .order_by(RelacionPaciente.id)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
