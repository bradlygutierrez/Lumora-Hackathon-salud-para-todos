from fastapi import APIRouter, Query, Response, status

from lumora_api.api.dependencies import SessionDep
from lumora_api.api.v1.catalog_router import ERRORS
from lumora_api.repositories.contact_repository import ContactRepository
from lumora_api.schemas import (
    EmergencyContactCreate,
    EmergencyContactRead,
    EmergencyContactUpdate,
    Page,
)
from lumora_api.services.identity_service import EmergencyContactService

router = APIRouter(
    prefix="/pacientes/{patient_id}/contactos-emergencia",
    tags=["Contactos de emergencia"],
)


def service(session: SessionDep) -> EmergencyContactService:
    return EmergencyContactService(ContactRepository(session))


@router.get("", response_model=Page[EmergencyContactRead])
async def list_contacts(
    patient_id: int,
    session: SessionDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    items, total = await service(session).list_for_patient(patient_id, limit, offset)
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=EmergencyContactRead, status_code=201, responses={404: ERRORS[404]})
async def create_contact(
    patient_id: int, data: EmergencyContactCreate, session: SessionDep
):
    return await service(session).create_for_patient(patient_id, data)


@router.get("/{contact_id}", response_model=EmergencyContactRead, responses={404: ERRORS[404]})
async def get_contact(patient_id: int, contact_id: int, session: SessionDep):
    return await service(session).get_for_patient(patient_id, contact_id)


@router.patch("/{contact_id}", response_model=EmergencyContactRead, responses={404: ERRORS[404]})
async def update_contact(
    patient_id: int,
    contact_id: int,
    data: EmergencyContactUpdate,
    session: SessionDep,
):
    return await service(session).update_for_patient(patient_id, contact_id, data)


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT, responses={404: ERRORS[404]})
async def delete_contact(patient_id: int, contact_id: int, session: SessionDep) -> Response:
    await service(session).delete_for_patient(patient_id, contact_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
