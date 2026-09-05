import pytest
from sqlalchemy import select

from helpers.medical import create_active_medical_professional
from lumora_api.core.security import create_access_token, hash_password
from lumora_api.models import (
    ConsultaMedica,
    EstadoExpediente,
    Expediente,
    Permiso,
    Persona,
    Rol,
    Usuario,
)


async def seed_estado_activo(session_factory) -> None:
    async with session_factory() as session:
        existing = await session.scalar(
            select(EstadoExpediente).where(EstadoExpediente.nombre == "Activo")
        )
        if existing is None:
            session.add(EstadoExpediente(nombre="Activo"))
            await session.commit()


def auth_headers(user_id: int) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user_id)}"}


async def create_actor(session_factory, *, username: str, clinical: bool = False) -> int:
    async with session_factory() as session:
        permissions = [Permiso(nombre="clinica:manage")] if clinical else []
        role = Rol(nombre="Profesional" if clinical else "Paciente", permisos=permissions)
        user = Usuario(
            persona=Persona(nombres="Actor", apellidos=username),
            email=f"{username}@example.com",
            username=username,
            password_hash=hash_password("safe-password"),
            roles=[role],
        )
        session.add(user)
        await session.flush()
        if clinical:
            await create_active_medical_professional(session, user=user, username=username)
        await session.commit()
        return user.id


def emergency_payload(*, nombres: str = "Sin Nombre Completo", with_contact: bool = True):
    payload = {
        "persona": {"nombres": nombres, "apellidos": "Desconocido"},
        "motivo_consulta": "Ingresa por trauma, estado crítico",
    }
    if with_contact:
        payload["contacto_emergencia"] = {
            "nombre": "Vecino Acompañante",
            "parentesco": "Vecino",
            "telefono": "8888-9999",
        }
    return payload


@pytest.mark.asyncio
async def test_emergency_registration_requires_clinical_permission(client, session_factory):
    payload = emergency_payload()

    assert (
        await client.post("/api/v1/pacientes/registro-emergencia", json=payload)
    ).status_code == 401

    patient_user = await create_actor(session_factory, username="patient-emergency")
    forbidden = await client.post(
        "/api/v1/pacientes/registro-emergencia",
        headers=auth_headers(patient_user),
        json=payload,
    )
    assert forbidden.status_code == 403


@pytest.mark.asyncio
async def test_emergency_registration_creates_patient_record_and_first_consultation(
    client, session_factory
):
    await seed_estado_activo(session_factory)
    clinician = await create_actor(session_factory, username="clinician-emergency", clinical=True)

    response = await client.post(
        "/api/v1/pacientes/registro-emergencia",
        headers=auth_headers(clinician),
        json=emergency_payload(nombres="Juan"),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["paciente"]["persona"]["nombres"] == "Juan"
    assert body["paciente"]["persona"]["apellidos"] == "Desconocido"
    # Sin dirección ni fecha de nacimiento: nada de eso es obligatorio en emergencia.
    assert body["paciente"]["persona"]["direcciones"] == []
    assert body["paciente"]["contactos_emergencia"][0]["nombre"] == "Vecino Acompañante"
    assert body["expediente_id"] > 0
    assert body["consulta_id"] > 0

    async with session_factory() as session:
        record = await session.get(Expediente, body["expediente_id"])
        assert record is not None
        assert record.paciente_id == body["paciente"]["id"]
        assert record.numero_expediente.startswith("EMG-")

        consultation = await session.get(ConsultaMedica, body["consulta_id"])
        assert consultation is not None
        assert consultation.expediente_id == record.id
        assert consultation.paciente_id == body["paciente"]["id"]
        assert consultation.motivo == "Ingresa por trauma, estado crítico"


@pytest.mark.asyncio
async def test_emergency_registration_without_emergency_contact(client, session_factory):
    await seed_estado_activo(session_factory)
    clinician = await create_actor(session_factory, username="clinician-emergency-solo", clinical=True)

    response = await client.post(
        "/api/v1/pacientes/registro-emergencia",
        headers=auth_headers(clinician),
        json=emergency_payload(nombres="Solo", with_contact=False),
    )

    assert response.status_code == 201
    assert response.json()["paciente"]["contactos_emergencia"] == []


@pytest.mark.asyncio
async def test_emergency_registration_requires_a_professional_profile(client, session_factory):
    # Un usuario con clinica:manage pero sin ProfesionalSalud (p. ej. un
    # administrador) no puede figurar como el profesional que atendió la
    # consulta -- resolve_current_professional debe rechazarlo.
    admin = await create_actor(session_factory, username="admin-emergency", clinical=False)
    async with session_factory() as session:
        user = await session.get(Usuario, admin)
        await session.refresh(user, ["roles"])
        role = user.roles[0]
        await session.refresh(role, ["permisos"])
        permission = await session.scalar(
            select(Permiso).where(Permiso.nombre == "clinica:manage")
        )
        if permission is None:
            permission = Permiso(nombre="clinica:manage")
            session.add(permission)
            await session.flush()
        role.permisos.append(permission)
        await session.commit()

    response = await client.post(
        "/api/v1/pacientes/registro-emergencia",
        headers=auth_headers(admin),
        json=emergency_payload(),
    )
    assert response.status_code == 403
