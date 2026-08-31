from datetime import datetime, timezone

from fastapi import APIRouter, Request, Response

from lumora_api.api.dependencies import CurrentUser, SessionDep
from lumora_api.repositories.clinical_integration_repository import ClinicalIntegrationRepository
from lumora_api.schemas.medical_record_document import MedicalRecordDocumentRead
from lumora_api.services.authorization import ensure_can_access_patient_data
from lumora_api.services.medical_record_document_service import MedicalRecordDocumentService
from lumora_api.services.medical_record_pdf_service import MedicalRecordPdfService

router = APIRouter(
    prefix='/patients/{patient_id}/medical-record-document',
    tags=['Expediente documental'],
)


def document_service(session: SessionDep) -> MedicalRecordDocumentService:
    return MedicalRecordDocumentService(ClinicalIntegrationRepository(session))


@router.get('', response_model=MedicalRecordDocumentRead)
async def get_medical_record_document(
    patient_id: int, session: SessionDep, current_user: CurrentUser
) -> MedicalRecordDocumentRead:
    await ensure_can_access_patient_data(session, current_user, patient_id, action='read')
    return await document_service(session).build(patient_id)


@router.get('/pdf', response_class=Response)
async def export_medical_record_document_pdf(
    patient_id: int, request: Request, session: SessionDep, current_user: CurrentUser
) -> Response:
    await ensure_can_access_patient_data(session, current_user, patient_id, action='read')
    repository = ClinicalIntegrationRepository(session)
    document = await MedicalRecordDocumentService(repository).build(patient_id)
    pdf = MedicalRecordPdfService().render(document)
    await repository.add_pdf_export_audit(
        patient_id=patient_id,
        user_id=current_user.id,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get('user-agent'),
    )
    filename = f'lumora-expediente-{patient_id}-{datetime.now(timezone.utc):%Y%m%d}.pdf'
    return Response(
        content=pdf,
        media_type='application/pdf',
        headers={
            'Content-Disposition': f'attachment; filename="{filename}"',
            'Cache-Control': 'private, no-store',
            'Pragma': 'no-cache',
            'X-Content-Type-Options': 'nosniff',
        },
    )
