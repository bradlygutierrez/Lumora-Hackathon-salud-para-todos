import pytest
from sqlalchemy import select

from lumora_api.models import Permiso, Rol, Usuario


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
