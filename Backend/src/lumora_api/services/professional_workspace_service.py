from datetime import date, datetime, timedelta, timezone

from lumora_api.core.exceptions import PermissionDeniedError, ResourceConflictError, ResourceNotFoundError
from lumora_api.models import ProfesionalSalud, Usuario
from lumora_api.repositories.appointment_repository import AppointmentRepository
from lumora_api.repositories.identity_repository import IdentityRepository
from lumora_api.repositories.professional_workspace_repository import ProfessionalWorkspaceRepository
from lumora_api.schemas.professional_workspace import ProfessionalScheduleCreate, ProfessionalScheduleUpdate
from lumora_api.services.appointment_service import AppointmentService


class ProfessionalWorkspaceService:
    def __init__(self, repository: ProfessionalWorkspaceRepository) -> None:
        self.repository = repository
        self.appointments = AppointmentRepository(repository.session)

    async def _professional(self, current_user: Usuario) -> ProfesionalSalud:
        item = await IdentityRepository(
            self.repository.session, ProfesionalSalud
        ).get_by_persona_id(current_user.persona_id)
        if item is None:
            raise PermissionDeniedError(
                "El usuario autenticado no tiene un perfil profesional de salud"
            )
        return item

    async def list_schedules(self, current_user: Usuario):
        professional = await self._professional(current_user)
        return await self.repository.list_schedules(professional.id)

    async def _ensure_schedule_period(
        self,
        *,
        professional_id: int,
        day: int,
        start,
        end,
        active: bool,
        exclude_id: int | None = None,
    ) -> None:
        if start >= end:
            raise ResourceConflictError("hora_inicio debe ser menor que hora_fin")
        if not active:
            return
        overlap = await self.repository.active_overlap(
            professional_id,
            day,
            start,
            end,
            exclude_id,
        )
        if overlap is not None:
            raise ResourceConflictError(
                "El horario se solapa con otro rango activo del profesional"
            )

    async def create_schedule(
        self, current_user: Usuario, data: ProfessionalScheduleCreate
    ):
        professional = await self._professional(current_user)
        values = data.model_dump()
        await self._ensure_schedule_period(
            professional_id=professional.id,
            day=values["dia_semana"],
            start=values["hora_inicio"],
            end=values["hora_fin"],
            active=values["activo"],
        )
        return await self.repository.create_schedule(professional.id, values)

    async def update_schedule(
        self,
        current_user: Usuario,
        schedule_id: int,
        data: ProfessionalScheduleUpdate,
    ):
        professional = await self._professional(current_user)
        item = await self.repository.get_schedule(professional.id, schedule_id)
        if item is None:
            raise ResourceNotFoundError("Horario profesional no encontrado")
        changes = data.model_dump(exclude_unset=True)
        day = changes.get("dia_semana", item.dia_semana)
        start = changes.get("hora_inicio", item.hora_inicio)
        end = changes.get("hora_fin", item.hora_fin)
        active = changes.get("activo", item.activo)
        await self._ensure_schedule_period(
            professional_id=professional.id,
            day=day,
            start=start,
            end=end,
            active=active,
            exclude_id=item.id,
        )
        return await self.repository.update_schedule(item, changes)

    async def delete_schedule(
        self, current_user: Usuario, schedule_id: int
    ) -> None:
        professional = await self._professional(current_user)
        item = await self.repository.get_schedule(professional.id, schedule_id)
        if item is None:
            raise ResourceNotFoundError("Horario profesional no encontrado")
        await self.repository.delete_schedule(item)

    @staticmethod
    def _is_cancelled(item) -> bool:
        return bool(
            item.status is not None
            and item.status.nombre.casefold() == "cancelada"
        )

    async def _agenda_items(
        self,
        professional_id: int,
        *,
        desde: datetime,
        hasta: datetime | None,
    ):
        items = await self.appointments.list(None, professional_id, desde, hasta)
        items = [
            item
            for item in items
            if not self._is_cancelled(item)
        ]
        patient_ids = sorted({item.paciente_id for item in items})
        patients = {
            patient.id: patient
            for patient in await self.repository.patients_by_ids(patient_ids)
        }
        return [
            {
                "id": item.id,
                "paciente_id": item.paciente_id,
                "paciente_nombre": (
                    f"{patients[item.paciente_id].persona.nombres} "
                    f"{patients[item.paciente_id].persona.apellidos}"
                ).strip(),
                "inicio": item.inicio,
                "fin": item.fin,
                "notas": item.notas,
                "estado": item.status,
                "tipo_cita": item.appointment_type,
                "ubicacion": item.location,
            }
            for item in items
            if item.paciente_id in patients
        ]

    async def agenda(
        self,
        current_user: Usuario,
        desde: datetime | None,
        hasta: datetime | None,
    ):
        professional = await self._professional(current_user)
        resolved_from = desde or datetime.now(timezone.utc)
        resolved_to = hasta or (resolved_from + timedelta(days=90))
        if resolved_from >= resolved_to:
            raise ResourceConflictError(
                "El inicio del rango debe ser menor que el fin"
            )
        return await self._agenda_items(
            professional.id,
            desde=resolved_from,
            hasta=resolved_to,
        )

    async def availability(
        self,
        current_user: Usuario,
        fecha: date,
        slot_minutes: int,
    ):
        professional = await self._professional(current_user)
        result = await AppointmentService(self.appointments).availability(
            professional.id, fecha, slot_minutes
        )
        return {"fecha": result.fecha, "slots": result.slots}

    async def my_patients(self, current_user: Usuario):
        professional = await self._professional(current_user)
        patient_ids = await self.repository.related_patient_ids(professional.id)
        patients = await self.repository.patients_by_ids(patient_ids)
        patients.sort(
            key=lambda item: (
                item.persona.apellidos.casefold(),
                item.persona.nombres.casefold(),
                item.id,
            )
        )

        now = datetime.now(timezone.utc)
        upcoming = await self._agenda_items(
            professional.id,
            desde=now,
            hasta=None,
        )
        next_by_patient = {}
        for item in upcoming:
            next_by_patient.setdefault(item["paciente_id"], item)

        consultations = await self.repository.last_consultations(
            professional.id, patient_ids
        )
        last_by_patient = {}
        for item in consultations:
            last_by_patient.setdefault(item.paciente_id, item)

        return [
            {
                "paciente": patient,
                "proxima_cita": next_by_patient.get(patient.id),
                "ultima_consulta": last_by_patient.get(patient.id),
            }
            for patient in patients
        ]
