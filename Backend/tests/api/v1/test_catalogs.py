import pytest


@pytest.mark.asyncio
async def test_catalog_crud_pagination_and_uniform_errors(client):
    created = await client.post("/api/v1/sexos", json={"nombre": "Femenino"})
    assert created.status_code == 201
    item_id = created.json()["id"]

    conflict = await client.post("/api/v1/sexos", json={"nombre": "Femenino"})
    assert conflict.status_code == 409
    assert conflict.json() == {
        "error": {"code": "conflict", "message": "Ya existe sexo con ese nombre"}
    }

    page = await client.get("/api/v1/sexos", params={"limit": 1, "offset": 0})
    assert page.json() == {
        "items": [{"id": item_id, "nombre": "Femenino"}],
        "total": 1,
        "limit": 1,
        "offset": 0,
    }

    updated = await client.patch(
        f"/api/v1/sexos/{item_id}", json={"nombre": "No especificado"}
    )
    assert updated.json()["nombre"] == "No especificado"
    assert (await client.delete(f"/api/v1/sexos/{item_id}")).status_code == 204

    missing = await client.get(f"/api/v1/sexos/{item_id}")
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "not_found"


@pytest.mark.asyncio
async def test_roles_assign_permissions_and_permissions_are_read_only(client, session_factory):
    from lumora_api.models import Permiso

    async with session_factory() as session:
        permission = Permiso(nombre="usuarios:leer", descripcion="Consultar usuarios")
        session.add(permission)
        await session.commit()
        permission_id = permission.id

    role = await client.post(
        "/api/v1/roles",
        json={"nombre": "Administrador", "permiso_ids": [permission_id]},
    )
    assert role.status_code == 201
    assert role.json()["permisos"][0]["nombre"] == "usuarios:leer"

    permissions = await client.get("/api/v1/permisos")
    assert permissions.status_code == 200
    assert permissions.json()["total"] == 1
    assert (await client.post("/api/v1/permisos", json={"nombre": "x"})).status_code == 405


@pytest.mark.asyncio
async def test_swagger_groups_catalogs(client):
    schema = (await client.get("/openapi.json")).json()
    tags = {operation["tags"][0] for path in schema["paths"].values() for operation in path.values()}
    assert {"Roles", "Permisos", "Estados de cita", "Tipos de cita", "Sexos", "Tipos de sangre"} <= tags
