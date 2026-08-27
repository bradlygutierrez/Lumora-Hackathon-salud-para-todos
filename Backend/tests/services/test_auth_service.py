from datetime import datetime, timedelta, timezone

import pytest

from lumora_api.core.exceptions import InvalidTokenError
from lumora_api.core.security import hash_password, hash_token, verify_password
from sqlalchemy import func, select

from lumora_api.models import Persona, Rol, Sexo, TipoSangre, TokenRecuperacion, Usuario, VerificacionCorreo
from lumora_api.repositories.auth_repository import AuthRepository
from lumora_api.schemas.auth import PatientRegistrationRequest
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


@pytest.mark.asyncio
async def test_registration_rolls_back_when_downstream_flush_fails(session_factory, monkeypatch):
    async with session_factory() as session:
        session.add_all([Rol(id=1, nombre="Paciente"), Sexo(id=1, nombre="Femenino"), TipoSangre(id=1, nombre="O+")])
        await session.commit()
        data = PatientRegistrationRequest.model_validate({
            "username": "rollback", "email": "rollback@example.com", "password": "Secure123!",
            "phone": "+50588888888", "first_names": "Rollback", "last_names": "Test",
            "birth_date": "2000-01-01", "sex_id": 1, "blood_type_id": 1,
            "address": {"line_1": "Casa", "city": "Managua", "country": "Nicaragua"},
            "emergency_contact": {"name": "Contacto", "relationship": "Madre", "phone": "+50587777777"},
            "accept_terms": True, "accept_privacy": True,
        })

        async def fail_flush(*_args, **_kwargs):
            raise RuntimeError("downstream failure")

        monkeypatch.setattr(session, "flush", fail_flush)
        with pytest.raises(RuntimeError, match="downstream failure"):
            await AuthService(AuthRepository(session)).register_patient(data)

    async with session_factory() as verification_session:
        assert await verification_session.scalar(select(func.count()).select_from(Persona)) == 0
        assert await verification_session.scalar(select(func.count()).select_from(Usuario)) == 0
