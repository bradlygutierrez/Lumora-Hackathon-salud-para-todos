from datetime import datetime, timedelta, timezone

from lumora_api.core.exceptions import ResourceConflictError, ResourceNotFoundError
from lumora_api.models import Cita, EventoAuditoria, Paciente, ProfesionalSalud
from lumora_api.repositories.appointment_repository import AppointmentRepository
from lumora_api.schemas.appointments import AppointmentCreate, AppointmentUpdate


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
        if await self.repository.session.get(Paciente, values["paciente_id"]) is None:
            raise ResourceNotFoundError("Paciente no existe")
        if await self.repository.session.get(ProfesionalSalud, values["profesional_id"]) is None:
            raise ResourceNotFoundError("Profesional no existe")
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
        await self._validate(values)
        item = Cita(**values)
        self.repository.session.add(item)
        await self.repository.session.flush()
        self._audit("CREATE", item, user_id, None, snapshot(item), ip, user_agent)
        await self.repository.session.commit()
        return item

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
        return item

    async def delete(self, appointment_id: int, user_id: int, ip: str | None, user_agent: str | None) -> None:
        item = await self.get(appointment_id)
        before = snapshot(item)
        self._audit("DELETE", item, user_id, before, None, ip, user_agent)
        await self.repository.session.delete(item)
        await self.repository.session.commit()
