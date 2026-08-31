from datetime import datetime, timedelta, timezone

import pytest

from lumora_api.core.exceptions import InvalidTokenError
from lumora_api.core.security import hash_password, hash_token, verify_password
from sqlalchemy import func, select

from lumora_api.models import Persona, Rol, SesionUsuario, Sexo, TipoSangre, TokenRecuperacion, Usuario, VerificacionCorreo
from lumora_api.repositories.auth_repository import AuthRepository
from lumora_api.schemas.auth import CaregiverRegistrationRequest, PatientRegistrationRequest
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


class FakeSender:
    def __init__(self, fail=False):
        self.calls = []
        self.fail = fail

    def send_password_reset(self, recipient, token):
        self.calls.append((recipient, token))
        if self.fail:
            raise RuntimeError("smtp unavailable")


@pytest.mark.asyncio
async def test_recovery_existing_user_invokes_sender_and_logs_failure(session_factory, caplog):
    async with session_factory() as session:
        user = await make_user(session)
        sender = FakeSender(fail=True)
        service = AuthService(AuthRepository(session), email_service=sender)
        with caplog.at_level("ERROR"):
            raw_token = await service.create_recovery(user.email)
        assert raw_token
        assert sender.calls and sender.calls[0][0] == user.email
        assert "Password recovery email delivery failed" in caplog.text
        assert raw_token not in caplog.text


@pytest.mark.asyncio
async def test_recovery_unknown_user_does_not_invoke_sender(session_factory):
    async with session_factory() as session:
        sender = FakeSender()
        service = AuthService(AuthRepository(session), email_service=sender)
        assert await service.create_recovery("missing@example.com") is None
        assert sender.calls == []


@pytest.mark.asyncio
async def test_recovery_success_invokes_sender_and_persists_hashed_token(session_factory):
    async with session_factory() as session:
        user = await make_user(session)
        sender = FakeSender()
        service = AuthService(AuthRepository(session), email_service=sender)
        raw_token = await service.create_recovery(user.email)
        assert sender.calls == [(user.email, raw_token)]
        stored = await AuthRepository(session).recovery_by_hash(hash_token(raw_token))
        assert stored is not None and stored.token_hash != raw_token


@pytest.mark.asyncio
async def test_recovery_token_is_hashed_expires_and_cannot_be_reused(session_factory):
    async with session_factory() as session:
        user = await make_user(session)
        service = AuthService(AuthRepository(session))
        raw_token = await service.create_recovery(user.email)
        stored = await AuthRepository(session).recovery_by_hash(hash_token(raw_token))
        assert stored.token_hash != raw_token

        await service.reset_password(raw_token, "StrongNew123!")
        assert verify_password("StrongNew123!", user.password_hash)
        with pytest.raises(InvalidTokenError):
            await service.reset_password(raw_token, "AnotherStrong123!")

        expired_raw = await service.create_recovery(user.email)
        expired = await AuthRepository(session).recovery_by_hash(hash_token(expired_raw))
        expired.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        await session.commit()
        with pytest.raises(InvalidTokenError):
            await service.reset_password(expired_raw, "AnotherStrong123!")


@pytest.mark.asyncio
async def test_reset_password_revokes_all_sessions(session_factory):
    async with session_factory() as session:
        user = await make_user(session)
        service = AuthService(AuthRepository(session))
        await service.create_session(user.id, None, None)
        await service.create_session(user.id, None, None)
        raw_token = await service.create_recovery(user.email)

        await service.reset_password(raw_token, "StrongNew123!")

        stored = list(
            await session.scalars(
                select(SesionUsuario).where(SesionUsuario.usuario_id == user.id)
            )
        )
        assert len(stored) == 2
        assert all(item.revoked_at is not None for item in stored)


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


@pytest.mark.asyncio
async def test_email_verification_code_is_valid_single_use_and_rejects_wrong_code(session_factory):
    async with session_factory() as session:
        user = await make_user(session)
        session.add(VerificacionCorreo(usuario_id=user.id, token_hash=hash_token("123456"), expires_at=datetime.now(timezone.utc) + timedelta(minutes=5)))
        await session.commit()
        service = AuthService(AuthRepository(session))
        with pytest.raises(InvalidTokenError):
            await service.verify_email_code(user.email, "000000")
        await service.verify_email_code(user.email, "123456")
        assert user.email_verificado is True
        with pytest.raises(InvalidTokenError):
            await service.verify_email_code(user.email, "123456")


@pytest.mark.asyncio
async def test_email_verification_code_expires(session_factory):
    async with session_factory() as session:
        user = await make_user(session)
        session.add(VerificacionCorreo(usuario_id=user.id, token_hash=hash_token("123456"), expires_at=datetime.now(timezone.utc) - timedelta(seconds=1)))
        await session.commit()
        with pytest.raises(InvalidTokenError):
            await AuthService(AuthRepository(session)).verify_email_code(user.email, "123456")


class CapturingEmailService:
    def __init__(self):
        self.verifications = []
    def send_verification_code(self, email, code):
        self.verifications.append((email, code))


def caregiver_registration_data() -> CaregiverRegistrationRequest:
    return CaregiverRegistrationRequest.model_validate(
        {
            "username": "caregiver",
            "email": "caregiver@example.com",
            "password": "Secure123!",
            "phone": "+50588888888",
            "first_names": "María",
            "last_names": "Cuidadora",
            "birth_date": "1990-01-01",
            "sex_id": 1,
            "address": {
                "line_1": "Casa",
                "city": "Managua",
                "country": "Nicaragua",
            },
            "accept_terms": True,
            "accept_privacy": True,
        }
    )


@pytest.mark.asyncio
async def test_caregiver_registration_sends_hashed_verification_code(session_factory):
    async with session_factory() as session:
        session.add_all([Rol(nombre="Cuidador"), Sexo(id=1, nombre="Femenino")])
        await session.commit()
        sender = CapturingEmailService()

        response = await AuthService(
            AuthRepository(session), sender
        ).register_caregiver(caregiver_registration_data())

        assert response["email_verified"] is False
        assert len(sender.verifications) == 1
        email, code = sender.verifications[0]
        assert email == "caregiver@example.com"
        verification = await AuthRepository(session).verification_by_hash(
            hash_token(code)
        )
        assert verification is not None
        assert verification.token_hash != code
        assert verification.expires_at > datetime.utcnow()


@pytest.mark.asyncio
async def test_resend_replaces_previous_code_and_hides_missing_or_verified_accounts(session_factory):
    async with session_factory() as session:
        user = await make_user(session)
        old = VerificacionCorreo(usuario_id=user.id, token_hash=hash_token("111111"), expires_at=datetime.now(timezone.utc) + timedelta(minutes=5))
        session.add(old)
        await session.commit()
        sender = CapturingEmailService()
        service = AuthService(AuthRepository(session), sender)
        await service.resend_verification(user.email, enforce_cooldown=False)
        assert old.consumed_at is not None
        assert len(sender.verifications) == 1
        email, code = sender.verifications[0]
        assert email == user.email and code.isdigit() and len(code) == 6
        assert (await AuthRepository(session).verification_by_hash(hash_token(code))).token_hash != code

        await service.resend_verification("missing@example.com", enforce_cooldown=False)
        user.email_verificado = True
        await session.commit()
        await service.resend_verification(user.email, enforce_cooldown=False)
        assert len(sender.verifications) == 1
