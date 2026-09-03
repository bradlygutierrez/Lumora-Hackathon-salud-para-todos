"""A15/B15 -- expediente médico documental (JSON) y su PDF.

Autorización: paciente propio, cuidador con relación activa de lectura,
o personal clínico con clinica:manage -- exactamente PatientAccessService,
la misma pieza que ya protege /patients/{id}/health-summary. Un
patient_id inexistente da 404 (no revela nada); uno que existe pero no
te pertenece da 403 (igual que health-summary, no un 404 -- así el
frontend puede distinguir "no existe" de "no tengo acceso").
"""

from datetime import datetime

from fastapi import APIRouter, Request, Response

from lumora_api.api.dependencies import CurrentUser, SessionDep
from lumora_api.api.v1.catalog_router import ERRORS
from lumora_api.core.exceptions import PermissionDeniedError, ResourceNotFoundError
from lumora_api.models import EventoAuditoria
from lumora_api.repositories.clinical_integration_repository import (
    ClinicalIntegrationRepository,
)
from lumora_api.repositories.patient_access_repository import PatientAccessRepository
from lumora_api.repositories.reminders import ReminderRepository
from lumora_api.schemas.clinical import PatientClinicalDocument
from lumora_api.services.clinical_document_pdf import render_clinical_document_pdf
from lumora_api.services.clinical_integration_service import ClinicalIntegrationService
from lumora_api.services.patient_access_service import PatientAccessService

router = APIRouter(prefix="/patients", tags=["Expediente médico"])


async def _authorize_read(session, current_user, patient_id: int) -> None:
    """Autoriza lectura del expediente.

    A15 -- ademas de PatientAccessService.require_access (paciente propio,
    cuidador con relacion activa, o staff con clinica:manage), un cuidador
    puede tener `puede_ver_expediente=False` en su relacion -- un permiso
    aparte de nivel_acceso que el paciente controla desde "Familiares
    Autorizados". Si esta apagado, el cuidador recibe 403 aunque su
    relacion este activa y sea de lectura o escritura.
    """
    repository = ClinicalIntegrationRepository(session)
    if await repository.get_patient(patient_id) is None:
        raise ResourceNotFoundError(f"Paciente con id {patient_id} no existe")
    try:
        await PatientAccessService(PatientAccessRepository(session)).require_access(
            current_user, patient_id, "read"
        )
    except ResourceNotFoundError as exc:
        raise PermissionDeniedError(
            "No tiene permiso para acceder al expediente de este paciente"
        ) from exc

    roles = {role.nombre.lower() for role in current_user.roles}
    if "cuidador" in roles:
        relationships = await ReminderRepository(
            session
        ).get_active_relationships_for_caregiver(current_user.id)
        relacion = next(
            (item for item in relationships if item.paciente_id == patient_id), None
        )
        if relacion is not None and not relacion.puede_ver_expediente:
            raise PermissionDeniedError(
                "El paciente no te dio permiso para ver ni descargar su expediente"
            )


def _service(session: SessionDep) -> ClinicalIntegrationService:
    return ClinicalIntegrationService(ClinicalIntegrationRepository(session))


def _safe_filename(patient_id: int, generated_at: datetime) -> str:
    stamp = generated_at.strftime("%Y%m%d-%H%M%S")
    return f"expediente-medico-paciente-{patient_id}-{stamp}.pdf"


@router.get(
    "/{patient_id}/medical-record",
    response_model=PatientClinicalDocument,
    responses={404: ERRORS[404]},
)
async def get_medical_record_document(
    patient_id: int, current_user: CurrentUser, session: SessionDep
):
    await _authorize_read(session, current_user, patient_id)
    return await _service(session).patient_document(patient_id, current_user)


@router.get(
    "/{patient_id}/medical-record/pdf",
    responses={404: ERRORS[404]},
)
async def get_medical_record_pdf(
    patient_id: int, current_user: CurrentUser, session: SessionDep, request: Request
) -> Response:
    await _authorize_read(session, current_user, patient_id)
    document = await _service(session).patient_document(patient_id, current_user)
    pdf_bytes = render_clinical_document_pdf(document)

    session.add(
        EventoAuditoria(
            usuario_id=current_user.id,
            accion="EXPORT",
            entidad="expediente_pdf",
            entidad_id=patient_id,
            datos_nuevos={"generado_en": document.generado_en.isoformat()},
            ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    )
    await session.commit()

    filename = _safe_filename(patient_id, document.generado_en)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )
