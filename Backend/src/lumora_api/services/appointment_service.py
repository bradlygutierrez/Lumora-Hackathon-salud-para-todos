from datetime import date, datetime, timedelta, timezone

from lumora_api.core.exceptions import ResourceConflictError, ResourceNotFoundError
from lumora_api.models import (
    Cita,
    EstadoCita,
    EventoAuditoria,
    Paciente,
    ProfesionalSalud,
    TipoCita,
    UbicacionAtencion,
)
from lumora_api.repositories.appointment_repository import AppointmentRepository
from lumora_api.schemas.appointments import (
    AppointmentCreate,
    AppointmentReschedule,
    AppointmentUpdate,
    AvailabilityRead, AvailabilitySlotRead,
)


def snapshot(item: Cita) -> dict:
    return {
        "paciente_id": item.paciente_id, "profesional_id": item.profesional_id,
        "tipo_cita_id": item.tipo_cita_id, "estado_cita_id": item.estado_cita_id,
        "inicio": item.inicio.isoformat(), "fin": item.fin.isoformat(), "notas": item.notas,
    }


class AppointmentService:
    def __init__(self, repository: AppointmentRepository) -> None:
        self.repository = repository

    async def list(self, paciente_id: int | None, profesional_id: int | None,
                   desde: datetime | None, hasta: datetime | None) -> list[Cita]:
        if desde is not None and hasta is not None and desde >= hasta:
            raise ResourceConflictError("El inicio del rango debe ser menor que el fin")
        return await self.repository.list(paciente_id, profesional_id, desde, hasta)

    async def get(self, appointment_id: int) -> Cita:
        item = await self.repository.get(appointment_id)
        if item is None:
            raise ResourceNotFoundError(f"Cita con id {appointment_id} no existe")
        return item

    async def _validate(self, values: dict, exclude_id: int | None = None) -> None:
        inicio, fin = values["inicio"], values["fin"]
        if inicio >= fin:
            raise ResourceConflictError("inicio debe ser menor que fin")
        if fin - inicio > timedelta(hours=12):
            raise ResourceConflictError("La duración máxima es de 12 horas")
        patient = await self.repository.session.get(Paciente, values["paciente_id"])
        if patient is None or patient.deleted_at is not None:
            raise ResourceNotFoundError("Paciente no existe")
        professional = await self.repository.session.get(
            ProfesionalSalud, values["profesional_id"]
        )
        if professional is None or professional.deleted_at is not None:
            raise ResourceNotFoundError("Profesional no existe")
        if (
            values.get("tipo_cita_id") is not None
            and await self.repository.session.get(TipoCita, values["tipo_cita_id"]) is None
        ):
            raise ResourceNotFoundError("Tipo de cita no existe")
        if (
            values.get("estado_cita_id") is not None
            and await self.repository.session.get(EstadoCita, values["estado_cita_id"]) is None
        ):
            raise ResourceNotFoundError("Estado de cita no existe")
        if values.get("ubicacion_id") is not None:
            location = await self.repository.session.get(UbicacionAtencion, values["ubicacion_id"])
            if location is None or not location.activo:
                raise ResourceNotFoundError("Ubicaci?n no existe")
        if values.get("tipo_cita_id") is not None:
            tipo = await self.repository.session.get(TipoCita, values["tipo_cita_id"])
            nombre = tipo.nombre.lower() if tipo else ""
            if nombre in {"presencial", "presencial"} and values.get("ubicacion_id") is None:
                raise ResourceConflictError("Las citas presenciales requieren ubicaci?n")
            if nombre in {"virtual", "telemedicina"} and values.get("ubicacion_id") is not None:
                raise ResourceConflictError("Las citas virtuales no requieren ubicaci?n")
        schedules = await self.repository.schedules(values["profesional_id"], inicio.weekday())
        if schedules and not any(s.hora_inicio <= inicio.timetz().replace(tzinfo=None) and s.hora_fin >= fin.timetz().replace(tzinfo=None) for s in schedules):
            raise ResourceConflictError("El horario solicitado est? fuera de la disponibilidad del profesional")
        if await self.repository.overlapping(values["paciente_id"], values["profesional_id"], inicio, fin, exclude_id):
            raise ResourceConflictError("La cita se solapa para el paciente o profesional")

    def _audit(self, action: str, item: Cita, user_id: int, before: dict | None,
               after: dict | None, ip: str | None, user_agent: str | None) -> None:
        self.repository.session.add(EventoAuditoria(
            usuario_id=user_id, accion=action, entidad="Cita", entidad_id=item.id,
            datos_anteriores=before, datos_nuevos=after, ip=ip, user_agent=user_agent,
        ))

    async def create(self, data: AppointmentCreate, user_id: int, ip: str | None, user_agent: str | None) -> Cita:
        values = data.model_dump()
        if values["estado_cita_id"] is None:
            pending = await self.repository.status_by_name("Pendiente")
            if pending is None:
                raise ResourceNotFoundError("Estado de cita Pendiente no existe")
            values["estado_cita_id"] = pending.id
        await self._validate(values)
        item = Cita(**values)
        self.repository.session.add(item)
        await self.repository.session.flush()
        self._audit("CREATE", item, user_id, None, snapshot(item), ip, user_agent)
        await self.repository.session.commit()
        return await self.get(item.id)

    async def update(self, appointment_id: int, data: AppointmentUpdate, user_id: int,
                     ip: str | None, user_agent: str | None) -> Cita:
        item = await self.get(appointment_id)
        before = snapshot(item)
        values = {**before, **data.model_dump(exclude_unset=True)}
        values["inicio"] = data.inicio if data.inicio is not None else item.inicio
        values["fin"] = data.fin if data.fin is not None else item.fin
        await self._validate(values, item.id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(item, field, value)
        item.updated_at = datetime.now(timezone.utc)
        self._audit("UPDATE", item, user_id, before, snapshot(item), ip, user_agent)
        await self.repository.session.commit()
        return await self.get(item.id)

    async def reschedule(
        self,
        appointment_id: int,
        data: AppointmentReschedule,
        user_id: int,
        ip: str | None,
        user_agent: str | None,
    ) -> Cita:
        item = await self.get(appointment_id)
        before = snapshot(item)
        values = {
            **before,
            "inicio": data.inicio,
            "fin": data.fin,
        }
        await self._validate(values, item.id)
        item.inicio = data.inicio
        item.fin = data.fin
        item.updated_at = datetime.now(timezone.utc)
        self._audit("RESCHEDULE", item, user_id, before, snapshot(item), ip, user_agent)
        await self.repository.session.commit()
        return await self.get(item.id)

    async def cancel(
        self, appointment_id: int, user_id: int, ip: str | None, user_agent: str | None, motivo: str | None = None
    ) -> Cita:
        item = await self.get(appointment_id)
        if item.status is not None and item.status.nombre.lower() in {
            "cancelada",
            "completada",
        }:
            raise ResourceConflictError("La cita ya no puede cancelarse")
        cancelled = await self.repository.status_by_name("Cancelada")
        if cancelled is None:
            raise ResourceNotFoundError("Estado de cita Cancelada no existe")
        before = snapshot(item)
        item.estado_cita_id = cancelled.id
        item.status = cancelled
        item.updated_at = datetime.now(timezone.utc)
        after = snapshot(item)
        if motivo:
            after["motivo_cancelacion"] = motivo
        self._audit("CANCEL", item, user_id, before, after, ip, user_agent)
        await self.repository.session.commit()
        return await self.get(item.id)

    async def available_professionals(self, search: str | None = None, specialty: str | None = None) -> list[ProfesionalSalud]:
        return await self.repository.available_professionals(search, specialty)

    async def availability(self, profesional_id: int, fecha: date, slot_minutes: int = 45) -> AvailabilityRead:
        professional = await self.repository.session.get(ProfesionalSalud, profesional_id)
        if professional is None or professional.deleted_at is not None:
            raise ResourceNotFoundError("Profesional no existe")
        schedules = await self.repository.schedules(profesional_id, fecha.weekday())
        slots = []
        for schedule in schedules:
            start = datetime.combine(fecha, schedule.hora_inicio, tzinfo=timezone.utc)
            end = datetime.combine(fecha, schedule.hora_fin, tzinfo=timezone.utc)
            cursor = start
            while cursor + timedelta(minutes=slot_minutes) <= end:
                slot_end = cursor + timedelta(minutes=slot_minutes)
                occupied = await self.repository.occupied(profesional_id, cursor, slot_end)
                slots.append(AvailabilitySlotRead(inicio=cursor, fin=slot_end, disponible=not occupied))
                cursor = slot_end
        return AvailabilityRead(profesional_id=profesional_id, fecha=fecha, slots=slots)

    async def delete(self, appointment_id: int, user_id: int, ip: str | None, user_agent: str | None) -> None:
        item = await self.get(appointment_id)
        before = snapshot(item)
        self._audit("DELETE", item, user_id, before, None, ip, user_agent)
        await self.repository.session.delete(item)
        await self.repository.session.commit()
