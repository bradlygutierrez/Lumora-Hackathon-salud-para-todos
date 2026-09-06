from datetime import time

from sqlalchemy import select, union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from lumora_api.models import Cita, ConsultaMedica, HorarioProfesional, Paciente, Persona, UbicacionAtencion


class ProfessionalWorkspaceRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_schedules(self, professional_id: int) -> list[HorarioProfesional]:
        return list(
            await self.session.scalars(
                select(HorarioProfesional)
                .where(HorarioProfesional.profesional_id == professional_id)
                .order_by(
                    HorarioProfesional.dia_semana,
                    HorarioProfesional.hora_inicio,
                    HorarioProfesional.id,
                )
            )
        )

    async def get_schedule(
        self, professional_id: int, schedule_id: int
    ) -> HorarioProfesional | None:
        return await self.session.scalar(
            select(HorarioProfesional).where(
                HorarioProfesional.id == schedule_id,
                HorarioProfesional.profesional_id == professional_id,
            )
        )

    async def active_overlap(
        self,
        professional_id: int,
        day: int,
        start: time,
        end: time,
        exclude_id: int | None = None,
    ) -> HorarioProfesional | None:
        query = select(HorarioProfesional).where(
            HorarioProfesional.profesional_id == professional_id,
            HorarioProfesional.dia_semana == day,
            HorarioProfesional.activo.is_(True),
            HorarioProfesional.hora_inicio < end,
            HorarioProfesional.hora_fin > start,
        )
        if exclude_id is not None:
            query = query.where(HorarioProfesional.id != exclude_id)
        return await self.session.scalar(query.limit(1))

    async def create_schedule(
        self, professional_id: int, values: dict
    ) -> HorarioProfesional:
        item = HorarioProfesional(profesional_id=professional_id, **values)
        self.session.add(item)
        await self.session.commit()
        await self.session.refresh(item)
        return item

    async def update_schedule(
        self, item: HorarioProfesional, values: dict
    ) -> HorarioProfesional:
        for field, value in values.items():
            setattr(item, field, value)
        await self.session.commit()
        await self.session.refresh(item)
        return item

    async def delete_schedule(self, item: HorarioProfesional) -> None:
        await self.session.delete(item)
        await self.session.commit()

    async def get_location(self, professional_id: int) -> UbicacionAtencion | None:
        return await self.session.scalar(
            select(UbicacionAtencion).where(
                UbicacionAtencion.profesional_id == professional_id
            )
        )

    async def upsert_location(
        self, professional_id: int, values: dict, item: UbicacionAtencion | None
    ) -> UbicacionAtencion:
        if item is None:
            item = UbicacionAtencion(profesional_id=professional_id, **values)
            self.session.add(item)
        else:
            for field, value in values.items():
                setattr(item, field, value)
        await self.session.commit()
        await self.session.refresh(item)
        return item

    async def delete_location(self, item: UbicacionAtencion) -> None:
        await self.session.delete(item)
        await self.session.commit()

    async def related_patient_ids(self, professional_id: int) -> list[int]:
        appointment_ids = select(Cita.paciente_id).where(
            Cita.profesional_id == professional_id
        )
        consultation_ids = select(ConsultaMedica.paciente_id).where(
            ConsultaMedica.profesional_id == professional_id,
            ConsultaMedica.deleted_at.is_(None),
        )
        statement = union(appointment_ids, consultation_ids).subquery()
        return list(
            await self.session.scalars(
                select(statement.c.paciente_id).order_by(statement.c.paciente_id)
            )
        )

    async def patients_by_ids(self, patient_ids: list[int]) -> list[Paciente]:
        if not patient_ids:
            return []
        return list(
            await self.session.scalars(
                select(Paciente)
                .where(
                    Paciente.id.in_(patient_ids),
                    Paciente.deleted_at.is_(None),
                )
                .options(
                    selectinload(Paciente.persona).selectinload(Persona.direcciones)
                )
            )
        )

    async def last_consultations(
        self, professional_id: int, patient_ids: list[int]
    ) -> list[ConsultaMedica]:
        if not patient_ids:
            return []
        return list(
            await self.session.scalars(
                select(ConsultaMedica)
                .where(
                    ConsultaMedica.profesional_id == professional_id,
                    ConsultaMedica.paciente_id.in_(patient_ids),
                    ConsultaMedica.deleted_at.is_(None),
                    ConsultaMedica.activo.is_(True),
                )
                .order_by(
                    ConsultaMedica.paciente_id,
                    ConsultaMedica.fecha_consulta.desc(),
                    ConsultaMedica.id.desc(),
                )
            )
        )
