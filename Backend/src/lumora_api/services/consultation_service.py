from datetime import datetime

from pydantic import BaseModel

from lumora_api.core.exceptions import PermissionDeniedError, ResourceNotFoundError
from lumora_api.models import (
    ConsultaMedica,
    Expediente,
    MotivoConsulta,
    NotaClinica,
    Paciente,
    ProfesionalSalud,
    SignoVital,
    Usuario,
)
from lumora_api.repositories.consultation_repository import ConsultationRepository
from lumora_api.services.authorization import (
    ensure_patient_is_assigned_to_professional,
    resolve_current_professional,
)


class ConsultationService:
    def __init__(self, repository: ConsultationRepository) -> None:
        self.repository = repository

    async def _require(self, model, item_id: int, resource_name: str):
        item = await self.repository.session.get(model, item_id)
        if item is None or getattr(item, "deleted_at", None) is not None:
            raise ResourceNotFoundError(f"{resource_name} con id {item_id} no existe")
        return item

    async def _require_catalog(self, model, item_id: int | None, resource_name: str):
        if item_id is None:
            return None
        item = await self.repository.session.get(model, item_id)
        if item is None:
            raise ResourceNotFoundError(f"{resource_name} con id {item_id} no existe")
        return item

    async def _validate_consultation_values(self, values: dict) -> None:
        record = await self._require(Expediente, values["expediente_id"], "Expediente")
        await self._require(Paciente, values["paciente_id"], "Paciente")
        await self._require(ProfesionalSalud, values["profesional_id"], "Profesional")
        await self._require_catalog(
            MotivoConsulta, values.get("motivo_consulta_id"), "Motivo de consulta"
        )
        if record.paciente_id != values["paciente_id"]:
            raise ResourceNotFoundError(
                "El expediente no pertenece al paciente indicado"
            )

    async def list(
        self,
        limit: int,
        offset: int,
        *,
        expediente_id: int | None = None,
        paciente_id: int | None = None,
        profesional_id: int | None = None,
        activo: bool | None = None,
        fecha_desde: datetime | None = None,
        fecha_hasta: datetime | None = None,
    ):
        return await self.repository.list_consultations(
            limit,
            offset,
            {
                "expediente_id": expediente_id,
                "paciente_id": paciente_id,
                "profesional_id": profesional_id,
                "activo": activo,
                "fecha_desde": fecha_desde,
                "fecha_hasta": fecha_hasta,
            },
        )

    async def list_for_record(self, record_id: int, limit: int, offset: int, activo: bool | None):
        await self._require(Expediente, record_id, "Expediente")
        return await self.list(limit, offset, expediente_id=record_id, activo=activo)

    async def get(self, consultation_id: int) -> ConsultaMedica:
        item = await self.repository.get_consultation(consultation_id)
        if item is None:
            raise ResourceNotFoundError(f"Consulta médica con id {consultation_id} no existe")
        return item

    async def create(self, data: BaseModel, current_user: Usuario) -> ConsultaMedica:
        values = data.model_dump(exclude_none=True)
        await self._validate_consultation_values(values)
        professional = await resolve_current_professional(
            self.repository.session, current_user
        )
        if values["profesional_id"] != professional.id:
            raise PermissionDeniedError(
                "No puede registrar una consulta a nombre de otro profesional"
            )
        await ensure_patient_is_assigned_to_professional(
            self.repository.session, professional.id, values["paciente_id"]
        )
        item = await self.repository.create_consultation(values)
        await self.repository.session.commit()
        return item

    async def update(self, consultation_id: int, data: BaseModel) -> ConsultaMedica:
        item = await self.get(consultation_id)
        values = data.model_dump(exclude_unset=True, exclude_none=True)
        if "profesional_id" in values:
            await self._require(ProfesionalSalud, values["profesional_id"], "Profesional")
        await self._require_catalog(
            MotivoConsulta, values.get("motivo_consulta_id"), "Motivo de consulta"
        )
        item = await self.repository.update_consultation(item, values)
        await self.repository.session.commit()
        return item

    async def delete(self, consultation_id: int) -> None:
        await self.repository.soft_delete_consultation(await self.get(consultation_id))
        await self.repository.session.commit()

    async def list_vital_signs(self, consultation_id: int, limit: int, offset: int):
        await self.get(consultation_id)
        return await self.repository.list_vital_signs(consultation_id, limit, offset)

    async def create_vital_signs(self, consultation_id: int, data: BaseModel) -> SignoVital:
        await self.get(consultation_id)
        item = await self.repository.create_vital_signs(
            {"consulta_id": consultation_id, **data.model_dump(exclude_none=True)}
        )
        await self.repository.session.commit()
        return item

    async def list_notes(
        self, consultation_id: int, limit: int, offset: int, activo: bool | None
    ):
        await self.get(consultation_id)
        return await self.repository.list_notes(consultation_id, limit, offset, activo)

    async def create_note(
        self, consultation_id: int, author_id: int, data: BaseModel
    ) -> NotaClinica:
        await self.get(consultation_id)
        item = await self.repository.create_note(
            {
                "consulta_id": consultation_id,
                "autor_id": author_id,
                **data.model_dump(exclude_none=True),
            }
        )
        await self.repository.session.commit()
        return item

    async def get_note(self, consultation_id: int, note_id: int) -> NotaClinica:
        await self.get(consultation_id)
        item = await self.repository.get_note(consultation_id, note_id)
        if item is None:
            raise ResourceNotFoundError(f"Nota clínica con id {note_id} no existe")
        return item

    async def update_note(
        self, consultation_id: int, note_id: int, data: BaseModel
    ) -> NotaClinica:
        item = await self.get_note(consultation_id, note_id)
        values = data.model_dump(exclude_unset=True, exclude_none=True)
        item = await self.repository.update_note(item, values)
        await self.repository.session.commit()
        return item
