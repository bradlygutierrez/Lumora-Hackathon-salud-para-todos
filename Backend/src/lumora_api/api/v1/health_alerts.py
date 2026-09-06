from typing import List

from fastapi import APIRouter

from lumora_api.api.dependencies import CurrentUser, SessionDep
from lumora_api.repositories.patient_access_repository import PatientAccessRepository
from lumora_api.schemas.health_alerts import HealthAlertResponse
from lumora_api.services.health_alerts_service import HealthAlertsService
from lumora_api.services.patient_access_service import PatientAccessService

router = APIRouter(prefix="/health-alerts", tags=["Alertas de salud"])


def _patient_access(session: SessionDep) -> PatientAccessService:
    return PatientAccessService(PatientAccessRepository(session))


@router.get("/patients/{paciente_id}", response_model=List[HealthAlertResponse])
async def listar_alertas_de_salud(
    paciente_id: int,
    current_user: CurrentUser,
    session: SessionDep,
):
    # A09: mismo criterio de acceso que health-indicators y notificaciones
    # (paciente ve lo propio, cuidador ve solo pacientes con relacion
    # activa autorizada).
    await _patient_access(session).require_access(current_user, paciente_id, action="read")
    return await HealthAlertsService.get_health_alerts(session, paciente_id)
