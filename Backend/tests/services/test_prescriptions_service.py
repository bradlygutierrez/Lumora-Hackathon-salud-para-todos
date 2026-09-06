import pytest

from helpers.medical import create_active_medical_professional

from lumora_api.core.exceptions import PermissionDeniedError, ResourceNotFoundError
from lumora_api.models import Paciente, Permiso, Persona, Rol, Usuario
from lumora_api.repositories.prescriptions import PrescriptionRepository
from lumora_api.schemas.prescriptions import (
    DetalleRecetaCreate,
    MedicamentoCreate,
    RecetaCreate,
)
from lumora_api.services.prescriptions import PrescriptionService


async def _make_patient_user(session, *, username: str) -> tuple[Usuario, int]:
    person = Persona(nombres="P", apellidos=username)
    # permisos=[] explícito (no solo Rol(nombre=...)): un Rol recién creado
    # y luego flusheado, si nunca se le asigna `permisos`, hace que
    # SQLAlchemy trate ese atributo como "no cargado" y dispare un lazy
    # load real al leerlo -- fuera de una request HTTP (donde el usuario se
    # carga con un select() que sí dispara el eager load en cadena vía
    # lazy="selectin") eso revienta con MissingGreenlet. Con la lista vacía
    # ya queda "cargada" en memoria y no hace falta ninguna consulta.
    user = Usuario(
        persona=person,
        email=f"{username}@example.com",
        username=username,
        password_hash="x",
        roles=[Rol(nombre=f"Rol-{username}", permisos=[])],
    )
    session.add(user)
    await session.flush()
    patient = Paciente(persona_id=person.id)
    session.add(patient)
    await session.flush()
    return user, patient.id


async def _make_staff_user(session) -> Usuario:
    role = Rol(nombre="Staff", permisos=[Permiso(nombre="clinica:manage")])
    user = Usuario(
        persona=Persona(nombres="Doc", apellidos="Staff"),
        email="staff@example.com",
        username="staff",
        password_hash="x",
        roles=[role],
    )
    session.add(user)
    await session.flush()
    await create_active_medical_professional(session, user=user, username="staff")
    return user


async def _create_receta_for(session, paciente_id: int) -> str:
    repository = PrescriptionRepository(session)
    medicamento = await repository.create_medicamento(MedicamentoCreate(nombre="Losartán"))
    receta = await repository.create_receta(
        RecetaCreate(
            paciente_id=paciente_id,
            profesional_id=1,
            detalles=[
                DetalleRecetaCreate(
                    medicamento_id=medicamento.id,
                    unidad_medida_id=1,
                    via_administracion_id=1,
                    dosis="50mg",
                    frecuencia="Cada 12 horas",
                    duracion_dias=30,
                    cantidad_total=60,
                )
            ],
        )
    )
    return receta.id


@pytest.mark.asyncio
async def test_owner_patient_can_view_own_receta(session_factory):
    async with session_factory() as session:
        owner, patient_id = await _make_patient_user(session, username="owner")
        receta_id = await _create_receta_for(session, patient_id)

        service = PrescriptionService(PrescriptionRepository(session))
        receta = await service.get_receta(session, owner, receta_id)

        assert receta.id == receta_id


@pytest.mark.asyncio
async def test_other_patient_cannot_view_receta(session_factory):
    async with session_factory() as session:
        _, patient_id = await _make_patient_user(session, username="owner2")
        receta_id = await _create_receta_for(session, patient_id)
        stranger, _ = await _make_patient_user(session, username="stranger")

        service = PrescriptionService(PrescriptionRepository(session))
        with pytest.raises(PermissionDeniedError):
            await service.get_receta(session, stranger, receta_id)


@pytest.mark.asyncio
async def test_clinical_staff_can_view_any_receta(session_factory):
    async with session_factory() as session:
        _, patient_id = await _make_patient_user(session, username="owner3")
        receta_id = await _create_receta_for(session, patient_id)
        staff = await _make_staff_user(session)

        service = PrescriptionService(PrescriptionRepository(session))
        receta = await service.get_receta(session, staff, receta_id)

        assert receta.id == receta_id


@pytest.mark.asyncio
async def test_get_receta_raises_not_found_before_permission_check(session_factory):
    async with session_factory() as session:
        someone, _ = await _make_patient_user(session, username="owner4")
        service = PrescriptionService(PrescriptionRepository(session))

        with pytest.raises(ResourceNotFoundError):
            await service.get_receta(session, someone, "no-existe")


@pytest.mark.asyncio
async def test_get_recetas_by_patient_denies_other_patient(session_factory):
    async with session_factory() as session:
        _, patient_id = await _make_patient_user(session, username="owner5")
        stranger, _ = await _make_patient_user(session, username="stranger2")

        service = PrescriptionService(PrescriptionRepository(session))
        with pytest.raises(PermissionDeniedError):
            await service.get_recetas_by_patient(session, stranger, patient_id)
