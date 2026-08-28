from fastapi import APIRouter

from lumora_api.api.dependencies import CurrentUser, SessionDep
from lumora_api.repositories.patient_access_repository import PatientAccessRepository
from lumora_api.schemas.caregivers import CaregiverPatientList
from lumora_api.services.patient_access_service import PatientAccessService

router = APIRouter(prefix="/caregivers", tags=["Cuidadores"])


@router.get("/me/patients", response_model=CaregiverPatientList)
async def linked_patients(current_user: CurrentUser, session: SessionDep) -> CaregiverPatientList:
    service = PatientAccessService(PatientAccessRepository(session))
    return CaregiverPatientList(items=await service.linked_patients(current_user))
