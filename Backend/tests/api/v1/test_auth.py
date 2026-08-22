import pytest
from sqlalchemy import select

from lumora_api.models import IntentoInicioSesion, Permiso, Rol, SesionUsuario, Usuario


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
