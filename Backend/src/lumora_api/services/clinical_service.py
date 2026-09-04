from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError

from lumora_api.core.exceptions import ResourceConflictError, ResourceNotFoundError
from lumora_api.models import (
    Alergia,
    AntecedenteMedico,
    Discapacidad,
    EstadoCondicion,
    EstadoExpediente,
    Expediente,
    NivelSeveridad,
    Paciente,
    TipoAntecedente,
    Usuario,
)
from lumora_api.repositories.clinical_repository import ClinicalRepository
from lumora_api.services.authorization import (
    ensure_patient_is_assigned_to_professional,
    resolve_current_professional,
)


async def _commit(repository: ClinicalRepository, message: str) -> None:
    try:
        await repository.session.commit()
    except IntegrityError as error:
        await repository.session.rollback()
        raise ResourceConflictError(message) from error


class ClinicalService:
    def __init__(self, repository: ClinicalRepository) -> None:
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


class MedicalRecordService(ClinicalService):
    async def list(self, limit: int, offset: int, activo: bool | None):
        return await self.repository.list(limit, offset, activo)

    async def get(self, record_id: int) -> Expediente:
        record = await self.repository.get(record_id)
        if record is None:
            raise ResourceNotFoundError(f"Expediente con id {record_id} no existe")
        return record

    async def create(self, data: BaseModel) -> Expediente:
        await self._require(Paciente, data.paciente_id, "Paciente")
        await self._require_catalog(
            EstadoExpediente, data.estado_expediente_id, "Estado de expediente"
        )
        if data.activo and await self.repository.active_record_for_patient(data.paciente_id):
            raise ResourceConflictError("El paciente ya posee un expediente activo")
        record = await self.repository.create(data.model_dump())
        await _commit(self.repository, "El número de expediente ya existe")
        return record

    async def update(self, record_id: int, data: BaseModel) -> Expediente:
        record = await self.get(record_id)
        values = data.model_dump(exclude_unset=True)
        await self._require_catalog(
            EstadoExpediente, values.get("estado_expediente_id"), "Estado de expediente"
        )
        if values.get("activo") is True:
            active = await self.repository.active_record_for_patient(record.paciente_id)
            if active is not None and active.id != record.id:
                raise ResourceConflictError("El paciente ya posee un expediente activo")
        record = await self.repository.update(record, values)
        await _commit(self.repository, "El número de expediente ya existe")
        return record

    async def delete(self, record_id: int) -> None:
        await self.repository.soft_delete(await self.get(record_id))
        await self.repository.session.commit()


class MedicalHistoryService(ClinicalService):
    async def _record(self, record_id: int) -> Expediente:
        return await self._require(Expediente, record_id, "Expediente")

    async def list_for_record(
        self, record_id: int, limit: int, offset: int, activo: bool | None
    ):
        await self._record(record_id)
        return await self.repository.list_by_parent(
            "expediente_id", record_id, limit, offset, activo
        )

    async def get_for_record(self, record_id: int, history_id: int) -> AntecedenteMedico:
        await self._record(record_id)
        item = await self.repository.get_by_parent("expediente_id", record_id, history_id)
        if item is None:
            raise ResourceNotFoundError(f"Antecedente médico con id {history_id} no existe")
        return item

    async def _ensure_assigned(self, current_user: Usuario, record: Expediente) -> None:
        professional = await resolve_current_professional(self.repository.session, current_user)
        await ensure_patient_is_assigned_to_professional(
            self.repository.session, professional.id, record.paciente_id
        )

    async def create_for_record(
        self, record_id: int, data: BaseModel, current_user: Usuario
    ) -> AntecedenteMedico:
        record = await self._record(record_id)
        await self._ensure_assigned(current_user, record)
        await self._require_catalog(
            TipoAntecedente, data.tipo_antecedente_id, "Tipo de antecedente"
        )
        if await self.repository.duplicate_history(
            record_id, data.tipo_antecedente_id, data.descripcion
        ):
            raise ResourceConflictError("El antecedente médico ya existe")
        item = await self.repository.create(
            {"expediente_id": record_id, **data.model_dump()}
        )
        await self.repository.session.commit()
        return item

    async def update_for_record(
        self, record_id: int, history_id: int, data: BaseModel, current_user: Usuario
    ) -> AntecedenteMedico:
        item = await self.get_for_record(record_id, history_id)
        record = await self._record(record_id)
        await self._ensure_assigned(current_user, record)
        values = data.model_dump(exclude_unset=True)
        await self._require_catalog(
            TipoAntecedente, values.get("tipo_antecedente_id"), "Tipo de antecedente"
        )
        tipo_id = values.get("tipo_antecedente_id", item.tipo_antecedente_id)
        descripcion = values.get("descripcion", item.descripcion)
        if await self.repository.duplicate_history(
            record_id, tipo_id, descripcion, history_id
        ):
            raise ResourceConflictError("El antecedente médico ya existe")
        item = await self.repository.update(item, values)
        await self.repository.session.commit()
        return item

    async def delete_for_record(
        self, record_id: int, history_id: int, current_user: Usuario
    ) -> None:
        item = await self.get_for_record(record_id, history_id)
        record = await self._record(record_id)
        await self._ensure_assigned(current_user, record)
        await self.repository.soft_delete(item)
        await self.repository.session.commit()


class PatientClinicalItemService(ClinicalService):
    resource_name = "Elemento clínico"
    model = Alergia

    async def _patient(self, patient_id: int) -> Paciente:
        return await self._require(Paciente, patient_id, "Paciente")

    async def list_for_patient(
        self, patient_id: int, limit: int, offset: int, activo: bool | None
    ):
        await self._patient(patient_id)
        return await self.repository.list_by_parent(
            "paciente_id", patient_id, limit, offset, activo
        )

    async def get_for_patient(self, patient_id: int, item_id: int):
        await self._patient(patient_id)
        item = await self.repository.get_by_parent("paciente_id", patient_id, item_id)
        if item is None:
            raise ResourceNotFoundError(f"{self.resource_name} con id {item_id} no existe")
        return item

    async def _ensure_assigned(self, current_user: Usuario, patient_id: int) -> None:
        professional = await resolve_current_professional(self.repository.session, current_user)
        await ensure_patient_is_assigned_to_professional(
            self.repository.session, professional.id, patient_id
        )

    async def create_for_patient(self, patient_id: int, data: BaseModel, current_user: Usuario):
        await self._patient(patient_id)
        await self._ensure_assigned(current_user, patient_id)
        await self._validate_catalogs(data)
        if await self.repository.duplicate_patient_item(
            self.model, patient_id, data.nombre
        ):
            raise ResourceConflictError(f"{self.resource_name} ya existe")
        item = await self.repository.create({"paciente_id": patient_id, **data.model_dump()})
        await self.repository.session.commit()
        return item

    async def update_for_patient(
        self, patient_id: int, item_id: int, data: BaseModel, current_user: Usuario
    ):
        item = await self.get_for_patient(patient_id, item_id)
        await self._ensure_assigned(current_user, patient_id)
        values = data.model_dump(exclude_unset=True)
        await self._validate_catalogs(data)
        nombre = values.get("nombre", item.nombre)
        if await self.repository.duplicate_patient_item(
            self.model, patient_id, nombre, item_id
        ):
            raise ResourceConflictError(f"{self.resource_name} ya existe")
        item = await self.repository.update(item, values)
        await self.repository.session.commit()
        return item

    async def delete_for_patient(
        self, patient_id: int, item_id: int, current_user: Usuario
    ) -> None:
        item = await self.get_for_patient(patient_id, item_id)
        await self._ensure_assigned(current_user, patient_id)
        await self.repository.soft_delete(item)
        await self.repository.session.commit()

    async def _validate_catalogs(self, data: BaseModel) -> None:
        values = data.model_dump(exclude_unset=True)
        await self._require_catalog(
            EstadoCondicion, values.get("estado_condicion_id"), "Estado de condición"
        )


class AllergyService(PatientClinicalItemService):
    resource_name = "Alergia"
    model = Alergia

    async def _validate_catalogs(self, data: BaseModel) -> None:
        values = data.model_dump(exclude_unset=True)
        await super()._validate_catalogs(data)
        await self._require_catalog(
            NivelSeveridad, values.get("nivel_severidad_id"), "Nivel de severidad"
        )


class DisabilityService(PatientClinicalItemService):
    resource_name = "Discapacidad"
    model = Discapacidad
