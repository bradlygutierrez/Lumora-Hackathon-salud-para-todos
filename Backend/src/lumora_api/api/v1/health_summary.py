from fastapi import APIRouter
from lumora_api.api.dependencies import CurrentUser, SessionDep
from lumora_api.core.exceptions import PermissionDeniedError, ResourceNotFoundError
from lumora_api.repositories.health_summary_repository import HealthSummaryRepository
from lumora_api.repositories.patient_access_repository import PatientAccessRepository
from lumora_api.schemas.health_summary import HealthSummaryRead
from lumora_api.services.health_summary_service import HealthSummaryService
from lumora_api.services.patient_access_service import PatientAccessService
router = APIRouter(prefix="/patients", tags=["Salud del paciente"])
@router.get("/{patient_id}/health-summary", response_model=HealthSummaryRead)
async def health_summary(patient_id: int, current_user: CurrentUser, session: SessionDep):
    try:
        await PatientAccessService(PatientAccessRepository(session)).require_access(current_user, patient_id, "read")
    except ResourceNotFoundError as exc:
        raise PermissionDeniedError("No tiene permiso para acceder a los datos de este paciente") from exc
    return await HealthSummaryService(HealthSummaryRepository(session)).get(patient_id)
