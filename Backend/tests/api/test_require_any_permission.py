import pytest

from lumora_api.api.dependencies import require_any_permission
from lumora_api.core.security import create_access_token, hash_password
from lumora_api.models import Permiso, Persona, Rol, Usuario


def test_require_any_permission_returns_a_callable_dependency():
    # Regresión: la factory dejaba de devolver `dependency`, así que
    # Depends(require_any_permission(...)) se volvía Depends(None) y
    # tumbaba el registro de rutas (y por lo tanto la app entera) al
    # arrancar.
    dependency = require_any_permission("a:manage", "b:manage")
    assert callable(dependency)


@pytest.mark.asyncio
async def test_require_any_permission_grants_access_with_only_the_second_permission(
    client, session_factory
):
    async with session_factory() as session:
        session.add(Rol(nombre="Administrador"))
        role = Rol(nombre="Afiliaciones manager", permisos=[Permiso(nombre="afiliaciones:manage")])
        user = Usuario(
            persona=Persona(nombres="Solo", apellidos="Afiliaciones"),
            email="solo-afiliaciones@example.com",
            username="solo-afiliaciones",
            password_hash=hash_password("safe-password"),
            roles=[role],
        )
        session.add(user)
        await session.commit()
        user_id = user.id

    headers = {"Authorization": f"Bearer {create_access_token(user_id)}"}
    response = await client.post(
        "/api/v1/usuarios/admin",
        headers=headers,
        json={
            "email": "new-admin-2@example.com",
            "username": "new-admin-2",
            "password": "safe-password",
            "persona": {"nombres": "Nuevo", "apellidos": "Administrador"},
        },
    )

    assert response.status_code == 201
