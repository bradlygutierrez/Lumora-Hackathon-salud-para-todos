from datetime import datetime, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from lumora_api.models import Cita, EstadoCita, ProfesionalSalud, HorarioProfesional, UbicacionAtencion, AfiliacionProfesional, AfiliacionMedica
from lumora_api.models.identity import Persona


class AppointmentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, appointment_id: int) -> Cita | None:
        return await self.session.scalar(
            select(Cita)
            .options(
                selectinload(Cita.professional).selectinload(ProfesionalSalud.persona),
                selectinload(Cita.status),
                selectinload(Cita.appointment_type),
            selectinload(Cita.location),
                selectinload(Cita.location),
            )
            .execution_options(populate_existing=True)
            .where(Cita.id == appointment_id)
        )

    async def list(self, paciente_id: int | None, profesional_id: int | None,
                   desde: datetime | None, hasta: datetime | None) -> list[Cita]:
        query = select(Cita).options(
            selectinload(Cita.professional).selectinload(ProfesionalSalud.persona),
            selectinload(Cita.status),
            selectinload(Cita.appointment_type),
            selectinload(Cita.location),
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
        ).outerjoin(EstadoCita, EstadoCita.id == Cita.estado_cita_id).where(
            or_(Cita.estado_cita_id.is_(None), func.lower(EstadoCita.nombre) != "cancelada")
        )
        if exclude_id is not None:
            query = query.where(Cita.id != exclude_id)
        return await self.session.scalar(query.limit(1))

    async def status_by_name(self, name: str) -> EstadoCita | None:
        return await self.session.scalar(
            select(EstadoCita).where(func.lower(EstadoCita.nombre) == name.lower())
        )

    async def available_professionals(self, search: str | None = None, specialty: str | None = None) -> list[ProfesionalSalud]:
        return list(
            await self.session.scalars(
                select(ProfesionalSalud)
                .join(Persona, Persona.id == ProfesionalSalud.persona_id)
                .options(selectinload(ProfesionalSalud.persona))
                .join(AfiliacionProfesional, AfiliacionProfesional.profesional_id == ProfesionalSalud.id).join(AfiliacionMedica, AfiliacionMedica.id == AfiliacionProfesional.afiliacion_id)
                .where(
                    ProfesionalSalud.deleted_at.is_(None),
                    ProfesionalSalud.licencia_verificada.is_(True),
                    AfiliacionProfesional.activo.is_(True),
                    AfiliacionMedica.estado == "active",
                    AfiliacionMedica.pago_estado == "paid",
                    (AfiliacionMedica.expira_en.is_(None) | (AfiliacionMedica.expira_en > datetime.now(timezone.utc))),
                    Persona.deleted_at.is_(None),
                    *( [or_(func.lower(Persona.nombres).contains(search.lower()), func.lower(Persona.apellidos).contains(search.lower()))] if search else [] ),
                    *( [func.lower(ProfesionalSalud.especialidad).contains(specialty.lower())] if specialty else [] ),
                )
                .order_by(Persona.apellidos, Persona.nombres, ProfesionalSalud.id)
            )
        )


    async def schedules(self, profesional_id: int, day: int) -> list[HorarioProfesional]:
        return list(await self.session.scalars(select(HorarioProfesional).where(HorarioProfesional.profesional_id == profesional_id, HorarioProfesional.dia_semana == day, HorarioProfesional.activo.is_(True)).order_by(HorarioProfesional.hora_inicio)))

    async def occupied(self, profesional_id: int, inicio, fin, exclude_id: int | None = None) -> list[Cita]:
        q = select(Cita).outerjoin(EstadoCita, EstadoCita.id == Cita.estado_cita_id).where(Cita.profesional_id == profesional_id, Cita.inicio < fin, Cita.fin > inicio, or_(Cita.estado_cita_id.is_(None), func.lower(EstadoCita.nombre) != "cancelada"))
        if exclude_id is not None: q = q.where(Cita.id != exclude_id)
        return list(await self.session.scalars(q))

    async def locations(self) -> list[UbicacionAtencion]:
        return list(await self.session.scalars(select(UbicacionAtencion).where(UbicacionAtencion.activo.is_(True)).order_by(UbicacionAtencion.nombre)))