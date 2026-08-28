from datetime import datetime

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from lumora_api.models import Cita
from lumora_api.models.identity import ProfesionalSalud


class AppointmentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, appointment_id: int) -> Cita | None:
        return await self.session.get(Cita, appointment_id)

    async def list(self, paciente_id: int | None, profesional_id: int | None,
                   desde: datetime | None, hasta: datetime | None) -> list[Cita]:
        query = select(Cita).options(
            selectinload(Cita.professional).selectinload(ProfesionalSalud.persona)
        ).order_by(Cita.inicio)
        if paciente_id is not None:
            query = query.where(Cita.paciente_id == paciente_id)
        if profesional_id is not None:
            query = query.where(Cita.profesional_id == profesional_id)
        if desde is not None:
            query = query.where(Cita.fin > desde)
        if hasta is not None:
            query = query.where(Cita.inicio < hasta)
        return list(await self.session.scalars(query))

    async def overlapping(self, paciente_id: int, profesional_id: int,
                          inicio: datetime, fin: datetime, exclude_id: int | None = None) -> Cita | None:
        query = select(Cita).where(
            or_(Cita.paciente_id == paciente_id, Cita.profesional_id == profesional_id),
            Cita.inicio < fin, Cita.fin > inicio,
        )
        if exclude_id is not None:
            query = query.where(Cita.id != exclude_id)
        return await self.session.scalar(query.limit(1))
