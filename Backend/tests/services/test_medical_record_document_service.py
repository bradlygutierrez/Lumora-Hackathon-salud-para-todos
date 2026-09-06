import pytest

from lumora_api.core.exceptions import ResourceNotFoundError
from lumora_api.services.medical_record_document_service import MedicalRecordDocumentService


class MissingPatientRepository:
    async def get_patient(self, patient_id: int):
        return None


@pytest.mark.asyncio
async def test_build_rejects_unknown_patient() -> None:
    service = MedicalRecordDocumentService(MissingPatientRepository())  # type: ignore[arg-type]
    with pytest.raises(ResourceNotFoundError):
        await service.build(999)
