from datetime import datetime, timedelta, timezone

import pytest

from lumora_api.core.exceptions import InvalidTokenError
from lumora_api.core.security import hash_password, hash_token, verify_password
from lumora_api.models import Persona, Rol, TokenRecuperacion, Usuario, VerificacionCorreo
from lumora_api.repositories.auth_repository import AuthRepository
from lumora_api.services.auth_service import AuthService


async def make_user(session) -> Usuario:
    user = Usuario(
        persona=Persona(nombres="Ana", apellidos="López"),
        email="ana@example.com",
        username="ana",
        password_hash=hash_password("old-password"),
        roles=[Rol(nombre="Paciente")],
    )
    session.add(user)
    await session.commit()
    return user


@pytest.mark.asyncio
async def test_recovery_token_is_hashed_expires_and_cannot_be_reused(session_factory):
    async with session_factory() as session:
        user = await make_user(session)
        service = AuthService(AuthRepository(session))
        raw_token = await service.create_recovery(user.email)
        stored = await AuthRepository(session).recovery_by_hash(hash_token(raw_token))
        assert stored.token_hash != raw_token

        await service.reset_password(raw_token, "new-password")
        assert verify_password("new-password", user.password_hash)
        with pytest.raises(InvalidTokenError):
            await service.reset_password(raw_token, "another-password")

        expired_raw = await service.create_recovery(user.email)
        expired = await AuthRepository(session).recovery_by_hash(hash_token(expired_raw))
        expired.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        await session.commit()
        with pytest.raises(InvalidTokenError):
            await service.reset_password(expired_raw, "another-password")


@pytest.mark.asyncio
async def test_email_verification_is_single_use_and_expires(session_factory):
    async with session_factory() as session:
        user = await make_user(session)
        service = AuthService(AuthRepository(session))
        raw_token = await service.create_email_verification(user)
        await service.verify_email(raw_token)
        assert user.email_verificado is True
        with pytest.raises(InvalidTokenError):
            await service.verify_email(raw_token)

        expired_raw = await service.create_email_verification(user)
        expired = await AuthRepository(session).verification_by_hash(hash_token(expired_raw))
        expired.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        await session.commit()
        with pytest.raises(InvalidTokenError):
            await service.verify_email(expired_raw)
