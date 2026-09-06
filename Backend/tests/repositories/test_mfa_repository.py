import pytest

from lumora_api.models import MetodoMfa, Persona, Rol, Usuario, UsuarioMetodoMfa
from lumora_api.repositories.mfa_repository import MfaRepository


@pytest.mark.asyncio
async def test_repository_returns_only_active_method(session_factory):
    async with session_factory() as session:
        user = Usuario(
            persona=Persona(nombres="Ana", apellidos="López"),
            email="ana@example.com",
            username="ana",
            password_hash="hash",
            roles=[Rol(nombre="Paciente")],
        )
        method = MetodoMfa(nombre="totp")
        configured = UsuarioMetodoMfa(
            usuario=user, metodo=method, secreto_cifrado="encrypted", activo=False
        )
        session.add_all([user, configured])
        await session.commit()

        repository = MfaRepository(session)
        assert await repository.active_method(user.id) is None
        configured.activo = True
        await session.commit()
        assert await repository.active_method(user.id) == configured
