from fastapi import APIRouter, Depends, Query, Response, status

from lumora_api.api.dependencies import CurrentUser, SessionDep, require_permission, require_clinical_access
from lumora_api.api.v1.catalog_router import ERRORS
from lumora_api.models import Alergia, Discapacidad
from lumora_api.repositories.clinical_repository import ClinicalRepository
from lumora_api.schemas import (
    AllergyCreate,
    AllergyRead,
    AllergyUpdate,
    DisabilityCreate,
    DisabilityRead,
    DisabilityUpdate,
    Page,
)
from lumora_api.services.clinical_service import AllergyService, DisabilityService

router = APIRouter(
    prefix="/pacientes/{patient_id}",
    tags=["Clínica de pacientes"],
    dependencies=[Depends(require_clinical_access)],
)


def allergy_service(session: SessionDep) -> AllergyService:
    return AllergyService(ClinicalRepository(session, Alergia))


def disability_service(session: SessionDep) -> DisabilityService:
    return DisabilityService(ClinicalRepository(session, Discapacidad))


@router.get("/alergias", response_model=Page[AllergyRead])
async def list_allergies(
    patient_id: int,
    session: SessionDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    activo: bool | None = None,
):
    items, total = await allergy_service(session).list_for_patient(
        patient_id, limit, offset, activo
    )
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post("/alergias", response_model=AllergyRead, status_code=201, responses=ERRORS)
async def create_allergy(
    patient_id: int, data: AllergyCreate, current_user: CurrentUser, session: SessionDep
):
    return await allergy_service(session).create_for_patient(patient_id, data, current_user)


@router.get("/alergias/{allergy_id}", response_model=AllergyRead, responses={404: ERRORS[404]})
async def get_allergy(patient_id: int, allergy_id: int, session: SessionDep):
    return await allergy_service(session).get_for_patient(patient_id, allergy_id)


@router.patch("/alergias/{allergy_id}", response_model=AllergyRead, responses=ERRORS)
async def update_allergy(
    patient_id: int,
    allergy_id: int,
    data: AllergyUpdate,
    current_user: CurrentUser,
    session: SessionDep,
):
    return await allergy_service(session).update_for_patient(
        patient_id, allergy_id, data, current_user
    )


@router.delete(
    "/alergias/{allergy_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={404: ERRORS[404]},
)
async def delete_allergy(
    patient_id: int, allergy_id: int, current_user: CurrentUser, session: SessionDep
) -> Response:
    await allergy_service(session).delete_for_patient(patient_id, allergy_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/discapacidades", response_model=Page[DisabilityRead])
async def list_disabilities(
    patient_id: int,
    session: SessionDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    activo: bool | None = None,
):
    items, total = await disability_service(session).list_for_patient(
        patient_id, limit, offset, activo
    )
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post(
    "/discapacidades", response_model=DisabilityRead, status_code=201, responses=ERRORS
)
async def create_disability(
    patient_id: int, data: DisabilityCreate, current_user: CurrentUser, session: SessionDep
):
    return await disability_service(session).create_for_patient(patient_id, data, current_user)


@router.get(
    "/discapacidades/{disability_id}",
    response_model=DisabilityRead,
    responses={404: ERRORS[404]},
)
async def get_disability(patient_id: int, disability_id: int, session: SessionDep):
    return await disability_service(session).get_for_patient(patient_id, disability_id)


@router.patch(
    "/discapacidades/{disability_id}",
    response_model=DisabilityRead,
    responses=ERRORS,
)
async def update_disability(
    patient_id: int,
    disability_id: int,
    data: DisabilityUpdate,
    current_user: CurrentUser,
    session: SessionDep,
):
    return await disability_service(session).update_for_patient(
        patient_id, disability_id, data, current_user
    )


@router.delete(
    "/discapacidades/{disability_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={404: ERRORS[404]},
)
async def delete_disability(
    patient_id: int, disability_id: int, current_user: CurrentUser, session: SessionDep
) -> Response:
    await disability_service(session).delete_for_patient(patient_id, disability_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
