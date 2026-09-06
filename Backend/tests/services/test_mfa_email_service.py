import pytest
from sqlalchemy import select
from lumora_api.core.security import hash_password, hash_token
from lumora_api.models import MetodoMfa, Persona, Rol, Usuario, UsuarioMetodoMfa, DesafioAutenticacion
from lumora_api.repositories.mfa_repository import MfaRepository
from lumora_api.services.mfa_service import MfaService

@pytest.mark.asyncio
async def test_email_mfa_setup_hashes_otp_and_confirms(monkeypatch, session_factory):
    sent = []
    monkeypatch.setattr("lumora_api.services.email_service.EmailService.send_mfa_code", lambda self, recipient, code: sent.append((recipient, code)))
    async with session_factory() as session:
        method = MetodoMfa(nombre="email")
        user = Usuario(persona=Persona(nombres="Ana", apellidos="Test"), email="ana@example.com", username="ana_email", password_hash=hash_password("Safe123!"), email_verificado=True, roles=[Rol(nombre="Paciente")])
        session.add_all([method, user]); await session.commit()
        service = MfaService(MfaRepository(session))
        setup = await service.setup(user, method.id)
        assert setup["challenge_token"] and "code" not in setup
        assert sent and sent[0][0] == user.email
        challenge = await session.scalar(select(DesafioAutenticacion))
        assert challenge.codigo_hash == hash_token(sent[0][1])
        configured = await session.scalar(select(UsuarioMetodoMfa).where(UsuarioMetodoMfa.usuario_id == user.id))
        assert configured.activo is False
        result = await service.confirm_setup(user.id, configured.id, sent[0][1])
        assert result["recovery_codes"]
        await session.refresh(configured)
        assert configured.activo is True
