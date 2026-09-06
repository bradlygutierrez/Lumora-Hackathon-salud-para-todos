import pytest
from sqlalchemy import select

from lumora_api.core.security import create_access_token, hash_password
from lumora_api.models import Permiso, Rol, Usuario, Persona


def _headers(user_id: int) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user_id)}"}


async def _actor(session_factory, *, username: str, permissions=()):
    async with session_factory() as session:
        role = Rol(nombre=f"role-{username}", permisos=[Permiso(nombre=name) for name in permissions])
        user = Usuario(
            persona=Persona(nombres="I03", apellidos=username),
            email=f"{username}@example.com",
            username=username,
            password_hash=hash_password("safe-password"),
            roles=[role],
        )
        session.add(user)
        await session.commit()
        return user.id


@pytest.mark.asyncio
async def test_endpoints_require_sistema_clientes_permission(client, session_factory):
    user_id = await _actor(session_factory, username="sin-permiso")
    response = await client.get("/api/v1/clientes-api", headers=_headers(user_id))
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_create_a_client_and_issue_and_revoke_a_key(client, session_factory):
    admin_id = await _actor(session_factory, username="admin-clientes", permissions=["sistema:clientes"])
    headers = _headers(admin_id)

    created = await client.post(
        "/api/v1/clientes-api",
        headers=headers,
        json={"client_id": "lumora-health-staff", "nombre": "Lumora Health Staff"},
    )
    assert created.status_code == 201
    client_pk = created.json()["id"]
    assert created.json()["activo"] is True

    duplicate = await client.post(
        "/api/v1/clientes-api",
        headers=headers,
        json={"client_id": "lumora-health-staff", "nombre": "Otro nombre"},
    )
    assert duplicate.status_code == 409

    issued = await client.post(f"/api/v1/clientes-api/{client_pk}/claves", headers=headers)
    assert issued.status_code == 201
    body = issued.json()
    assert body["api_key"].startswith("lumk_")
    assert body["key_prefix"] == body["api_key"][:12]
    key_id = body["id"]

    listed = await client.get(f"/api/v1/clientes-api/{client_pk}/claves", headers=headers)
    assert listed.status_code == 200
    for key in listed.json():
        assert "api_key" not in key
        assert "key_hash" not in key

    revoked = await client.patch(
        f"/api/v1/clientes-api/{client_pk}/claves/{key_id}/revocar", headers=headers
    )
    assert revoked.status_code == 200
    assert revoked.json()["activa"] is False
    assert revoked.json()["revoked_at"] is not None


@pytest.mark.asyncio
async def test_admin_can_deactivate_a_client(client, session_factory):
    admin_id = await _actor(session_factory, username="admin-clientes-2", permissions=["sistema:clientes"])
    headers = _headers(admin_id)

    created = await client.post(
        "/api/v1/clientes-api",
        headers=headers,
        json={"client_id": "lumora-web", "nombre": "Portal interno"},
    )
    client_pk = created.json()["id"]

    updated = await client.patch(
        f"/api/v1/clientes-api/{client_pk}", headers=headers, json={"activo": False}
    )
    assert updated.status_code == 200
    assert updated.json()["activo"] is False
