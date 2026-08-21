import pytest

from lumora_api.models import Persona, Rol, Usuario
from lumora_api.repositories.auth_repository import AuthRepository


@pytest.mark.asyncio
async def test_auth_repository_ignores_deleted_users(session_factory):
    async with session_factory() as session:
        role = Rol(nombre="Paciente")
        user = Usuario(
            persona=Persona(nombres="Ana", apellidos="López"),
            email="ana@example.com",
            username="ana",
            password_hash="hash",
            roles=[role],
        )
        session.add(user)
        await session.commit()
        repository = AuthRepository(session)
        assert await repository.user_by_login("ANA") == user

        user.activo = False
        await session.commit()
        assert await repository.user_by_login("ana") is None
