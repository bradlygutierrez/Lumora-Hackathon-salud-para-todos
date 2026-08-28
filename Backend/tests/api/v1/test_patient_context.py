import pytest
from sqlalchemy import select

from lumora_api.core.security import create_access_token, hash_password
from lumora_api.models import Paciente, Permiso, Persona, Rol, Usuario


async def seed_patient(session_factory):
    async with session_factory() as session:
        user = Usuario(
            persona=Persona(nombres="Ana", apellidos="López"),
            email="ana.context@example.com",
            username="ana-context",
            password_hash=hash_password("Strong123!"),
            roles=[Rol(nombre="Paciente")],
        )
        session.add(user)
        await session.flush()
        patient = Paciente(persona_id=user.persona_id)
        session.add(patient)
        await session.commit()
        return user.id, patient.id


@pytest.mark.asyncio
async def test_auth_me_returns_safe_current_user_context(client, session_factory):
    user_id, _ = await seed_patient(session_factory)
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {create_access_token(user_id)}"},
    )

    assert response.status_code == 200
    assert response.json()["id"] == user_id
    assert response.json()["roles"][0]["nombre"] == "Paciente"
    assert response.json()["persona"] == {"id": 1, "nombres": "Ana", "apellidos": "López"}
    assert "password_hash" not in response.json()


@pytest.mark.asyncio
async def test_patient_me_resolves_only_authenticated_users_patient(client, session_factory):
    user_id, patient_id = await seed_patient(session_factory)
    response = await client.get(
        "/api/v1/patients/me",
        headers={"Authorization": f"Bearer {create_access_token(user_id)}"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "patient_id": patient_id,
        "first_names": "Ana",
        "last_names": "López",
    }


@pytest.mark.asyncio
async def test_context_routes_reject_invalid_bearer(client):
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid-token"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_auth_me_returns_effective_role_permissions(client, session_factory):
    async with session_factory() as session:
        permission = Permiso(
            nombre="clinica:manage", descripcion="Gestionar expedientes clínicos"
        )
        role = Rol(nombre="Profesional", permisos=[permission])
        user = Usuario(
            persona=Persona(nombres="J08", apellidos="Staff"),
            email="j08.staff@example.com",
            username="j08-staff",
            password_hash=hash_password("Strong123!"),
            roles=[role],
        )
        session.add(user)
        await session.commit()
        user_id = user.id
        permission_id = permission.id

    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {create_access_token(user_id)}"},
    )

    assert response.status_code == 200
    assert response.json()["roles"][0]["nombre"] == "Profesional"
    assert response.json()["roles"][0]["permisos"] == [
        {"id": permission_id, "nombre": "clinica:manage"}
    ]
