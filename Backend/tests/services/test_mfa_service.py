from datetime import datetime, timedelta, timezone

import pytest
import pyotp

from lumora_api.core.exceptions import InvalidMfaCodeError, InvalidTokenError
from lumora_api.core.security import hash_password, hash_token
from lumora_api.models import MetodoMfa, Persona, Rol, Usuario
from lumora_api.repositories.mfa_repository import MfaRepository
from lumora_api.services.mfa_service import MfaService


async def configured_user(session):
    method = MetodoMfa(nombre="totp")
    user = Usuario(
        persona=Persona(nombres="Ana", apellidos="López"),
        email="ana@example.com",
        username="ana",
        password_hash=hash_password("safe-password"),
        roles=[Rol(nombre="Paciente")],
    )
    session.add_all([method, user])
    await session.commit()
    setup = await MfaService(MfaRepository(session)).setup(user, method.id)
    await MfaService(MfaRepository(session)).confirm_setup(user.id, setup["method_id"], pyotp.TOTP(setup["secret"]).now())
    return user, setup


@pytest.mark.asyncio
async def test_methods_exposes_only_supported_totp_when_not_configured(session_factory):
    async with session_factory() as session:
        user = Usuario(
            persona=Persona(nombres="Ana", apellidos="López"),
            email="methods@example.com",
            username="methods",
            password_hash=hash_password("safe-password"),
            roles=[Rol(nombre="Paciente")],
        )
        session.add_all([MetodoMfa(nombre="totp"), MetodoMfa(nombre="sms"), user])
        await session.commit()

        methods = await MfaService(MfaRepository(session)).methods(user.id)

        assert methods == [
            {"id": None, "metodo_id": 1, "nombre": "totp", "activo": False}
        ]


@pytest.mark.asyncio
async def test_expired_challenge_fails(session_factory):
    async with session_factory() as session:
        _, setup = await configured_user(session)
        service = MfaService(MfaRepository(session))
        challenge_data = await service.create_challenge("ana", "safe-password")
        challenge = await MfaRepository(session).challenge(
            hash_token(challenge_data["challenge_token"])
        )
        challenge.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        await session.commit()

        with pytest.raises(InvalidTokenError, match="expirado"):
            await service.verify(challenge_data["challenge_token"], "000000")


@pytest.mark.asyncio
async def test_challenge_stops_at_max_attempts(session_factory):
    async with session_factory() as session:
        _, setup = await configured_user(session)
        service = MfaService(MfaRepository(session))
        challenge_data = await service.create_challenge("ana", "safe-password")
        challenge = await MfaRepository(session).challenge(
            hash_token(challenge_data["challenge_token"])
        )
        challenge.max_intentos = 2
        await session.commit()

        valid = pyotp.TOTP(setup["secret"]).now()
        invalid = f"{(int(valid) + 1) % 1_000_000:06d}"
        for _ in range(2):
            with pytest.raises(InvalidMfaCodeError):
                await service.verify(challenge_data["challenge_token"], invalid)
        with pytest.raises(InvalidTokenError):
            await service.verify(challenge_data["challenge_token"], invalid)
