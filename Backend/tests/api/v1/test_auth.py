from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from lumora_api.core.security import hash_token

from lumora_api.models import (
    ContactoEmergencia,
    Direccion,
    IntentoInicioSesion,
    Paciente,
    Permiso,
    Persona,
    Rol,
    SesionUsuario,
    Sexo,
    TipoSangre,
    Usuario,
    VerificacionCorreo,
)


def registration_body(**overrides):
    body = {
        "username": "new-patient",
        "email": "new-patient@example.com",
        "password": "Secure123!",
        "phone": "+50588888888",
        "first_names": "Ana María",
        "last_names": "López Pérez",
        "birth_date": "2000-01-01",
        "sex_id": 1,
        "blood_type_id": 1,
        "address": {"line_1": "Casa 1", "city": "Managua", "department": "Managua", "country": "Nicaragua"},
        "emergency_contact": {"name": "María López", "relationship": "Madre", "phone": "+50587777777"},
        "accept_terms": True,
        "accept_privacy": True,
    }
    body.update(overrides)
    return body


async def seed_registration_catalogs(session_factory):
    async with session_factory() as session:
        session.add_all([Rol(id=1, nombre="Paciente"), Sexo(id=1, nombre="Femenino"), TipoSangre(id=1, nombre="O+")])
        await session.commit()


@pytest.mark.asyncio
async def test_patient_registration_is_atomic_and_returns_no_secrets(client, session_factory):
    await seed_registration_catalogs(session_factory)
    response = await client.post("/api/v1/auth/register", json=registration_body())
    assert response.status_code == 201
    assert set(response.json()) == {"user_id", "person_id", "patient_id", "emergency_contact_id", "email_verified", "status"}
    async with session_factory() as session:
        user = await session.scalar(select(Usuario).where(Usuario.username == "new-patient"))
        assert user.persona.nombres == "Ana María"
        assert [role.nombre for role in user.roles] == ["Paciente"]
        patient = await session.scalar(select(Paciente).where(Paciente.persona_id == user.persona_id))
        assert (await session.scalar(select(Direccion).where(Direccion.persona_id == user.persona_id))).es_principal is True
        assert (await session.scalar(select(ContactoEmergencia).where(ContactoEmergencia.paciente_id == patient.id))).parentesco == "Madre"
        assert response.json().get("password_hash") is None


@pytest.mark.asyncio
async def test_patient_registration_rejects_duplicate_email_and_username(client, session_factory):
    await seed_registration_catalogs(session_factory)
    assert (await client.post("/api/v1/auth/register", json=registration_body())).status_code == 201
    duplicate_email = await client.post("/api/v1/auth/register", json=registration_body(username="other"))
    duplicate_username = await client.post("/api/v1/auth/register", json=registration_body(email="other@example.com"))
    assert duplicate_email.status_code == 409
    assert duplicate_username.status_code == 409


@pytest.mark.asyncio
async def test_patient_registration_rejects_invalid_catalog_references_without_partial_rows(client, session_factory):
    await seed_registration_catalogs(session_factory)
    response = await client.post("/api/v1/auth/register", json=registration_body(sex_id=999))
    assert response.status_code == 404
    async with session_factory() as session:
        assert await session.scalar(select(Usuario).where(Usuario.email == "new-patient@example.com")) is None
        assert await session.scalar(select(Persona).where(Persona.nombres == "Ana María")) is None


@pytest.mark.asyncio
async def test_patient_registration_rejects_invalid_blood_type(client, session_factory):
    await seed_registration_catalogs(session_factory)
    response = await client.post("/api/v1/auth/register", json=registration_body(blood_type_id=999))
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


@pytest.mark.asyncio
@pytest.mark.parametrize("overrides", [{"password": "weak"}, {"accept_terms": False}, {"accept_privacy": False}])
async def test_patient_registration_validates_security_and_consents(client, session_factory, overrides):
    await seed_registration_catalogs(session_factory)
    response = await client.post("/api/v1/auth/register", json=registration_body(**overrides))
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_verify_email_accepts_six_digit_code_and_resend_is_generic(client, session_factory):
    await seed_registration_catalogs(session_factory)
    await client.post("/api/v1/auth/register", json=registration_body())
    async with session_factory() as session:
        user = await session.scalar(select(Usuario).where(Usuario.email == "new-patient@example.com"))
        session.add(VerificacionCorreo(usuario_id=user.id, token_hash=hash_token("123456"), expires_at=datetime.now(timezone.utc) + timedelta(minutes=5)))
        await session.commit()
    verified = await client.post("/api/v1/auth/verify-email", json={"email": "new-patient@example.com", "code": "123456"})
    resent = await client.post("/api/v1/auth/resend-verification", json={"email": "missing@example.com"})
    assert verified.status_code == 200
    assert resent.status_code == 200
    assert "existe" not in resent.json()["message"].lower()


async def register(client, session_factory, username: str):
    async with session_factory() as session:
        if await session.scalar(select(Rol).where(Rol.nombre == "Paciente")) is None:
            session.add(Rol(nombre="Paciente"))
            await session.commit()
    return await client.post(
        "/api/v1/usuarios",
        json={
            "email": f"{username}@example.com",
            "username": username,
            "password": "safe-password",
            "rol_id": 999,
            "persona": {"nombres": username, "apellidos": "Prueba"},
        },
    )


async def token(client, username: str) -> str:
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": username, "password": "safe-password"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_oauth_login_and_registration_cannot_escalate(client, session_factory):
    registered = await register(client, session_factory, "ana")
    assert registered.status_code == 201
    assert [role["nombre"] for role in registered.json()["roles"]] == ["Paciente"]
    access_token = await token(client, "ana")

    forbidden = await client.get(
        f"/api/v1/usuarios/{registered.json()['id']}/roles",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert forbidden.status_code == 403
    assert forbidden.json()["error"]["code"] == "forbidden"


@pytest.mark.asyncio
async def test_authorized_admin_can_assign_roles_and_permissions(client, session_factory):
    admin_response = await register(client, session_factory, "admin")
    target_response = await register(client, session_factory, "target")
    async with session_factory() as session:
        admin = await session.get(Usuario, admin_response.json()["id"])
        admin_role = Rol(nombre="Administrador")
        permission = Permiso(nombre="rbac:manage")
        admin_role.permisos = [permission]
        admin.roles.append(admin_role)
        doctor_role = Rol(nombre="Profesional")
        session.add(doctor_role)
        await session.commit()
        doctor_role_id = doctor_role.id
        permission_id = permission.id
        admin_role_id = admin_role.id

    access_token = await token(client, "admin")
    headers = {"Authorization": f"Bearer {access_token}"}
    assigned = await client.post(
        f"/api/v1/usuarios/{target_response.json()['id']}/roles",
        json={"rol_id": doctor_role_id},
        headers=headers,
    )
    assert assigned.status_code == 200
    assert {role["nombre"] for role in assigned.json()} == {"Paciente", "Profesional"}

    permissions = await client.get(
        f"/api/v1/roles/{admin_role_id}/permisos", headers=headers
    )
    assert permissions.status_code == 200
    assert permissions.json()[0]["id"] == permission_id


@pytest.mark.asyncio
async def test_forgot_password_does_not_reveal_accounts(client):
    missing = await client.post(
        "/api/v1/auth/forgot-password", json={"email": "missing@example.com"}
    )
    assert missing.status_code == 200
    assert "token" not in missing.json()


@pytest.mark.asyncio
async def test_session_login_refresh_rotation_and_logout(client, session_factory):
    await register(client, session_factory, "session-user")
    failed = await client.post("/api/v1/auth/login", json={"login": "session-user", "password": "wrong"})
    assert failed.status_code == 401

    logged = await client.post("/api/v1/auth/login", json={"login": "session-user@example.com", "password": "safe-password"})
    assert logged.status_code == 200
    first = logged.json()
    assert first["mfa_required"] is False
    headers = {"Authorization": f"Bearer {first['access_token']}"}
    assert (await client.get("/api/v1/auth/sessions", headers=headers)).status_code == 200

    refreshed = await client.post("/api/v1/auth/refresh", json={"refresh_token": first["refresh_token"]})
    assert refreshed.status_code == 200
    assert (await client.post("/api/v1/auth/refresh", json={"refresh_token": first["refresh_token"]})).status_code == 400

    new_headers = {"Authorization": f"Bearer {refreshed.json()['access_token']}"}
    assert (await client.post("/api/v1/auth/logout", headers=new_headers)).status_code == 200
    assert (await client.get("/api/v1/auth/sessions", headers=new_headers)).status_code == 401
    async with session_factory() as session:
        attempts = list(await session.scalars(select(IntentoInicioSesion)))
        stored = list(await session.scalars(select(SesionUsuario)))
        assert [attempt.exitoso for attempt in attempts[-2:]] == [False, True]
        assert stored[0].refresh_token_hash != first["refresh_token"]


@pytest.mark.asyncio
async def test_change_password_verifies_current_and_revokes_other_sessions(client, session_factory):
    await register(client, session_factory, "password-user")
    first = (await client.post("/api/v1/auth/login", json={"login": "password-user", "password": "safe-password"})).json()
    second = (await client.post("/api/v1/auth/login", json={"login": "password-user", "password": "safe-password"})).json()
    first_headers = {"Authorization": f"Bearer {first['access_token']}"}
    second_headers = {"Authorization": f"Bearer {second['access_token']}"}

    wrong = await client.post("/api/v1/auth/change-password", json={"current_password": "wrong", "new_password": "Stronger123!"}, headers=first_headers)
    weak = await client.post("/api/v1/auth/change-password", json={"current_password": "safe-password", "new_password": "weak"}, headers=first_headers)
    changed = await client.post("/api/v1/auth/change-password", json={"current_password": "safe-password", "new_password": "Stronger123!"}, headers=first_headers)
    assert wrong.status_code == 401
    assert weak.status_code == 422
    assert changed.status_code == 200
    assert (await client.get("/api/v1/auth/sessions", headers=first_headers)).status_code == 200
    assert (await client.get("/api/v1/auth/sessions", headers=second_headers)).status_code == 401
    assert (await client.post("/api/v1/auth/login", json={"login": "password-user", "password": "safe-password"})).status_code == 401
    assert (await client.post("/api/v1/auth/login", json={"login": "password-user", "password": "Stronger123!"})).status_code == 200
