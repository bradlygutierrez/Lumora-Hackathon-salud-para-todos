from fastapi import APIRouter, Depends, status
from lumora_api.api.dependencies import CurrentUser, SessionDep, require_permission
from lumora_api.models import ProfesionalSalud
from lumora_api.schemas.affiliations import AffiliationCreate, AffiliationRead, AffiliationUpdate, LicenseVerificationUpdate, MembershipRead, ProfessionalMembershipUpdate, ProfessionalProvisionCreate, ProvisionedProfessionalRead
from lumora_api.services.medical_affiliation_service import MedicalAffiliationService

router = APIRouter(prefix="/medical-affiliations", tags=["Profesionales de salud"], dependencies=[Depends(require_permission("afiliaciones:manage"))])

@router.post("", response_model=AffiliationRead, status_code=status.HTTP_201_CREATED)
async def create(data: AffiliationCreate, session: SessionDep, current_user: CurrentUser):
    return await MedicalAffiliationService(session).create(data, current_user.id)

@router.get("", response_model=list[AffiliationRead])
async def list_all(session: SessionDep): return await MedicalAffiliationService(session).list()

@router.get("/{affiliation_id}", response_model=AffiliationRead)
async def get(affiliation_id: int, session: SessionDep): return await MedicalAffiliationService(session).get(affiliation_id)

@router.patch("/{affiliation_id}", response_model=AffiliationRead)
async def update(affiliation_id: int, data: AffiliationUpdate, session: SessionDep, current_user: CurrentUser): return await MedicalAffiliationService(session).update(affiliation_id, data, current_user.id)

@router.post("/{affiliation_id}/professionals", response_model=ProvisionedProfessionalRead, status_code=status.HTTP_201_CREATED)
async def provision(affiliation_id: int, data: ProfessionalProvisionCreate, session: SessionDep, current_user: CurrentUser): return await MedicalAffiliationService(session).provision(affiliation_id, data, current_user.id)

@router.patch("/{affiliation_id}/professionals/{professional_id}", response_model=MembershipRead)
async def membership(affiliation_id: int, professional_id: int, data: ProfessionalMembershipUpdate, session: SessionDep, current_user: CurrentUser): return await MedicalAffiliationService(session).update_membership(affiliation_id, professional_id, data.activo, current_user.id)

@router.patch("/professionals/{professional_id}/license", response_model=dict)
async def verify_license(professional_id: int, data: LicenseVerificationUpdate, session: SessionDep, current_user: CurrentUser):
    professional = await MedicalAffiliationService(session).verify_license(professional_id, data.licencia_verificada, current_user.id)
    return {"professional_id": professional.id, "licencia_verificada": professional.licencia_verificada}




