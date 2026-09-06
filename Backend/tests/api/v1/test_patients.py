import pytest

from lumora_api.core.security import hash_password
from lumora_api.models import Paciente, Persona, Rol, Usuario


async def _patient_with_login(session_factory, username: str) -> int:
    async with session_factory() as session:
        person = Persona(nombres="Ana", apellidos="Paciente")
        user = Usuario(
            persona=person,
            email=f"{username}@example.com",
            username=username,
            password_hash=hash_password("safe-password"),
            roles=[Rol(nombre="Paciente")],
        )
        session.add(user)
        await session.flush()
        patient = Paciente(persona_id=person.id)
        session.add(patient)
        await session.commit()
        return patient.id


@pytest.mark.asyncio
async def test_get_my_patient_profile_resolves_paciente_id(client, session_factory):
    patient_id = await _patient_with_login(session_factory, "paciente1")
    login = await client.post(
        "/api/v1/auth/login", json={"login": "paciente1", "password": "safe-password"}
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    response = await client.get(
        "/api/v1/pacientes/me", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    assert response.json()["id"] == patient_id


@pytest.mark.asyncio
async def test_get_my_patient_profile_requires_auth(client):
    response = await client.get("/api/v1/pacientes/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_my_patient_profile_404_when_no_patient_record(client, session_factory):
    async with session_factory() as session:
        session.add(
            Usuario(
                persona=Persona(nombres="Admin", apellidos="Solo"),
                email="admin1@example.com",
                username="admin1",
                password_hash=hash_password("safe-password"),
                roles=[Rol(nombre="Administrador")],
            )
        )
        await session.commit()

    login = await client.post(
        "/api/v1/auth/login", json={"login": "admin1", "password": "safe-password"}
    )
    token = login.json()["access_token"]

    response = await client.get(
        "/api/v1/pacientes/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 404
