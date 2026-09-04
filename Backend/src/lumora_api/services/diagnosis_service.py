from pydantic import BaseModel

from lumora_api.core.exceptions import ResourceConflictError, ResourceNotFoundError
from lumora_api.models import (
    CondicionMedica,
    ConsultaMedica,
    Diagnostico,
    EstadoCondicion,
    Expediente,
    ProfesionalSalud,
    TipoDiagnostico,
    Usuario,
)
from lumora_api.repositories.diagnosis_repository import DiagnosisRepository
from lumora_api.services.authorization import (
    ensure_patient_is_assigned_to_professional,
    ensure_within_editable_window,
    resolve_current_professional,
)


VALID_CONDITION_TRANSITIONS = {
    "Activa": {"Resuelta", "Crónica", "En observación"},
    "En observación": {"Activa", "Resuelta", "Crónica"},
    "Crónica": {"Activa", "Resuelta", "En observación"},
    "Resuelta": set(),
}


class DiagnosisService:
    def __init__(self, repository: DiagnosisRepository) -> None:
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

    async def _consultation(self, consultation_id: int) -> ConsultaMedica:
        return await self._require(ConsultaMedica, consultation_id, "Consulta médica")

    async def list_for_consultation(self, consultation_id: int, limit: int, offset: int):
        await self._consultation(consultation_id)
        return await self.repository.list_diagnoses(consultation_id, limit, offset)

    async def get_diagnosis(self, diagnosis_id: int) -> Diagnostico:
        item = await self.repository.get_diagnosis(diagnosis_id)
        if item is None:
            raise ResourceNotFoundError(f"Diagnóstico con id {diagnosis_id} no existe")
        return item

    async def create_diagnosis(
        self, consultation_id: int, data: BaseModel, current_user: Usuario
    ) -> Diagnostico:
        consultation = await self._consultation(consultation_id)
        professional = await resolve_current_professional(
            self.repository.session, current_user
        )
        await ensure_patient_is_assigned_to_professional(
            self.repository.session, professional.id, consultation.paciente_id
        )
        await self._require_catalog(
            TipoDiagnostico, data.tipo_diagnostico_id, "Tipo de diagnóstico"
        )
        item = await self.repository.create_diagnosis(
            {
                "consulta_id": consultation_id,
                "expediente_id": consultation.expediente_id,
                "profesional_id": consultation.profesional_id,
                **data.model_dump(exclude_none=True),
            }
        )
        await self.repository.session.commit()
        return item

    async def update_diagnosis(
        self, diagnosis_id: int, data: BaseModel, current_user: Usuario
    ) -> Diagnostico:
        item = await self.get_diagnosis(diagnosis_id)
        record = await self._require(Expediente, item.expediente_id, "Expediente")
        professional = await resolve_current_professional(
            self.repository.session, current_user
        )
        await ensure_patient_is_assigned_to_professional(
            self.repository.session, professional.id, record.paciente_id
        )
        ensure_within_editable_window(item.created_at)
        values = data.model_dump(exclude_unset=True, exclude_none=True)
        await self._require_catalog(
            TipoDiagnostico, values.get("tipo_diagnostico_id"), "Tipo de diagnóstico"
        )
        item = await self.repository.update_diagnosis(item, values)
        await self.repository.session.commit()
        return item

    async def delete_diagnosis(self, diagnosis_id: int, current_user: Usuario) -> None:
        item = await self.get_diagnosis(diagnosis_id)
        record = await self._require(Expediente, item.expediente_id, "Expediente")
        professional = await resolve_current_professional(
            self.repository.session, current_user
        )
        await ensure_patient_is_assigned_to_professional(
            self.repository.session, professional.id, record.paciente_id
        )
        ensure_within_editable_window(item.created_at)
        await self.repository.soft_delete_diagnosis(item)
        await self.repository.session.commit()

    async def list_conditions(self, record_id: int, limit: int, offset: int, activo: bool | None):
        await self._require(Expediente, record_id, "Expediente")
        return await self.repository.list_conditions(record_id, limit, offset, activo)

    async def get_condition(self, condition_id: int) -> CondicionMedica:
        item = await self.repository.get_condition(condition_id)
        if item is None:
            raise ResourceNotFoundError(f"Condición médica con id {condition_id} no existe")
        return item

    async def _validate_condition_values(self, record: Expediente, values: dict) -> None:
        await self._require_catalog(
            EstadoCondicion, values.get("estado_condicion_id"), "Estado de condición"
        )
        diagnosis_id = values.get("diagnostico_id")
        if diagnosis_id is not None:
            diagnosis = await self.get_diagnosis(diagnosis_id)
            if diagnosis.expediente_id != record.id:
                raise ResourceNotFoundError("El diagnóstico no pertenece al expediente")

    async def create_condition(
        self, record_id: int, data: BaseModel, current_user: Usuario
    ) -> CondicionMedica:
        record = await self._require(Expediente, record_id, "Expediente")
        professional = await resolve_current_professional(
            self.repository.session, current_user
        )
        await ensure_patient_is_assigned_to_professional(
            self.repository.session, professional.id, record.paciente_id
        )
        values = data.model_dump(exclude={"motivo_historial"}, exclude_none=True)
        await self._validate_condition_values(record, values)
        if await self.repository.duplicate_condition(record_id, values["nombre"]):
            raise ResourceConflictError("La condición médica ya existe")
        item = await self.repository.create_condition(
            {"expediente_id": record_id, "paciente_id": record.paciente_id, **values}
        )
        await self.repository.add_history(
            {
                "condicion_id": item.id,
                "estado_anterior_id": None,
                "estado_nuevo_id": item.estado_condicion_id,
                "accion": "CREADA",
                "motivo": data.motivo_historial,
                "usuario_id": current_user.id,
            }
        )
        await self.repository.session.commit()
        return item

    async def update_condition(
        self, condition_id: int, data: BaseModel, current_user: Usuario
    ) -> CondicionMedica:
        item = await self.get_condition(condition_id)
        record = await self._require(Expediente, item.expediente_id, "Expediente")
        professional = await resolve_current_professional(
            self.repository.session, current_user
        )
        await ensure_patient_is_assigned_to_professional(
            self.repository.session, professional.id, item.paciente_id
        )
        values = data.model_dump(exclude={"motivo_historial"}, exclude_unset=True, exclude_none=True)
        await self._validate_condition_values(record, values)
        if "nombre" in values and await self.repository.duplicate_condition(
            item.expediente_id, values["nombre"], item.id
        ):
            raise ResourceConflictError("La condición médica ya existe")
        previous_state = item.estado_condicion_id
        next_state = values.get("estado_condicion_id", previous_state)
        if next_state != previous_state:
            await self._validate_transition(previous_state, next_state)
        item = await self.repository.update_condition(item, values)
        if next_state != previous_state:
            await self.repository.add_history(
                {
                    "condicion_id": item.id,
                    "estado_anterior_id": previous_state,
                    "estado_nuevo_id": next_state,
                    "accion": "CAMBIO_ESTADO",
                    "motivo": data.motivo_historial,
                    "usuario_id": current_user.id,
                }
            )
        await self.repository.session.commit()
        return item

    async def _validate_transition(self, previous_state_id: int, next_state_id: int) -> None:
        previous = await self._require_catalog(
            EstadoCondicion, previous_state_id, "Estado de condición"
        )
        next_state = await self._require_catalog(
            EstadoCondicion, next_state_id, "Estado de condición"
        )
        allowed = VALID_CONDITION_TRANSITIONS.get(previous.nombre)
        if allowed is not None and next_state.nombre not in allowed:
            raise ResourceConflictError(
                f"No se puede cambiar una condición de {previous.nombre} a {next_state.nombre}"
            )

    async def delete_condition(self, condition_id: int, current_user: Usuario) -> None:
        item = await self.get_condition(condition_id)
        professional = await resolve_current_professional(
            self.repository.session, current_user
        )
        await ensure_patient_is_assigned_to_professional(
            self.repository.session, professional.id, item.paciente_id
        )
        previous_state = item.estado_condicion_id
        await self.repository.soft_delete_condition(item)
        await self.repository.add_history(
            {
                "condicion_id": item.id,
                "estado_anterior_id": previous_state,
                "estado_nuevo_id": previous_state,
                "accion": "BORRADO_LOGICO",
                "motivo": "Borrado lógico",
                "usuario_id": current_user.id,
            }
        )
        await self.repository.session.commit()

    async def list_condition_history(self, condition_id: int, limit: int, offset: int):
        await self.get_condition(condition_id)
        return await self.repository.list_history(condition_id, limit, offset)
