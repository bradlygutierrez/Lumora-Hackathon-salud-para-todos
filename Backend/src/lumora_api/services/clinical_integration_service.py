from collections import defaultdict

from lumora_api.core.exceptions import ResourceNotFoundError
from lumora_api.repositories.clinical_integration_repository import (
    ClinicalIntegrationRepository,
)
from lumora_api.schemas import (
    AllergyRead,
    ClinicalNoteRead,
    ClinicalSearchResult,
    ClinicalTimelineItem,
    ConditionRead,
    ConsultationClinicalSummary,
    ConsultationRead,
    DiagnosisRead,
    DisabilityRead,
    MedicalHistoryRead,
    MedicalRecordRead,
    PatientClinicalSummary,
    VitalSignsRead,
)
from lumora_api.schemas.clinical import (
    ClinicalAlertSummary,
    ClinicalMeasurementSummary,
    ClinicalPatientIdentitySummary,
    ClinicalPrescriptionSummary,
)


class ClinicalIntegrationService:
    def __init__(self, repository: ClinicalIntegrationRepository) -> None:
        self.repository = repository

    async def patient_summary(self, patient_id: int) -> PatientClinicalSummary:
        patient = await self.repository.get_patient(patient_id)
        if patient is None:
            raise ResourceNotFoundError(f"Paciente con id {patient_id} no existe")
        record = await self.repository.active_record_for_patient(patient_id)
        if record is None:
            return PatientClinicalSummary(
                paciente_id=patient_id,
                paciente=ClinicalPatientIdentitySummary.model_validate(patient.persona),
                expediente=None,
                antecedentes=[],
                alergias=[],
                discapacidades=[],
                condiciones=[],
                consultas=[],
                recetas=[],
                mediciones=[],
                alertas=[],
            )

        payload = await self.repository.summary_payload(record)
        return PatientClinicalSummary(
            paciente_id=patient_id,
            paciente=ClinicalPatientIdentitySummary.model_validate(patient.persona),
            expediente=MedicalRecordRead.model_validate(payload["record"]),
            antecedentes=[
                MedicalHistoryRead.model_validate(item) for item in payload["histories"]
            ],
            alergias=[AllergyRead.model_validate(item) for item in payload["allergies"]],
            discapacidades=[
                DisabilityRead.model_validate(item) for item in payload["disabilities"]
            ],
            condiciones=[
                ConditionRead.model_validate(item) for item in payload["conditions"]
            ],
            consultas=self._consultation_summaries(payload),
            recetas=[
                ClinicalPrescriptionSummary.model_validate(item)
                for item in payload["prescriptions"]
            ],
            mediciones=[
                ClinicalMeasurementSummary.model_validate(item)
                for item in payload["measurements"]
            ],
            alertas=[
                ClinicalAlertSummary.model_validate(item) for item in payload["alerts"]
            ],
        )

    async def timeline(
        self, record_id: int, limit: int, offset: int, tipo: str | None
    ) -> tuple[list[ClinicalTimelineItem], int]:
        record = await self.repository.get_record(record_id)
        if record is None:
            raise ResourceNotFoundError(f"Expediente con id {record_id} no existe")
        items, total = await self.repository.timeline_items(
            record, tipo=tipo, limit=limit, offset=offset
        )
        return [ClinicalTimelineItem.model_validate(item) for item in items], total

    async def search(
        self,
        *,
        limit: int,
        offset: int,
        q: str | None,
        tipo: str | None,
        paciente_id: int | None,
        expediente_id: int | None,
    ) -> tuple[list[ClinicalSearchResult], int]:
        if (
            paciente_id is not None
            and await self.repository.get_patient(paciente_id) is None
        ):
            raise ResourceNotFoundError(f"Paciente con id {paciente_id} no existe")
        if (
            expediente_id is not None
            and await self.repository.get_record(expediente_id) is None
        ):
            raise ResourceNotFoundError(f"Expediente con id {expediente_id} no existe")
        items, total = await self.repository.search(
            patient_id=paciente_id,
            record_id=expediente_id,
            tipo=tipo,
            q=q,
            limit=limit,
            offset=offset,
        )
        return [ClinicalSearchResult.model_validate(item) for item in items], total

    def _consultation_summaries(self, payload: dict) -> list[ConsultationClinicalSummary]:
        vital_signs = defaultdict(list)
        for item in payload["vital_signs"]:
            vital_signs[item.consulta_id].append(VitalSignsRead.model_validate(item))

        notes = defaultdict(list)
        for item in payload["notes"]:
            notes[item.consulta_id].append(ClinicalNoteRead.model_validate(item))

        diagnoses = defaultdict(list)
        for item in payload["diagnoses"]:
            diagnoses[item.consulta_id].append(DiagnosisRead.model_validate(item))

        return [
            ConsultationClinicalSummary(
                consulta=ConsultationRead.model_validate(item),
                signos_vitales=vital_signs[item.id],
                notas=notes[item.id],
                diagnosticos=diagnoses[item.id],
            )
            for item in payload["consultations"]
        ]
