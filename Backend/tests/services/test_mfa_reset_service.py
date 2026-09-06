import pytest
from datetime import datetime, timezone
from sqlalchemy import select
from lumora_api.core.security import hash_token
from lumora_api.models import CodigoRecuperacionMfa, DesafioAutenticacion, MetodoMfa, Persona, Rol, Usuario, UsuarioMetodoMfa
from lumora_api.services.mfa_reset_service import reset_user_mfa
@pytest.mark.asyncio
async def test_reset_user_mfa(session_factory):
    async with session_factory() as s:
        u=Usuario(persona=Persona(nombres="Dev",apellidos="MFA"),email="mfa.dev@example.com",username="mfa_dev",password_hash="x",roles=[Rol(nombre="Paciente")]); m=MetodoMfa(nombre="totp"); s.add_all([u,m]); await s.flush()
        c=UsuarioMetodoMfa(usuario_id=u.id,metodo_id=m.id,secreto_cifrado="encrypted",activo=True); s.add(c); await s.flush(); s.add(CodigoRecuperacionMfa(usuario_metodo_id=c.id,codigo_hash=hash_token("code"))); s.add(DesafioAutenticacion(usuario_id=u.id,usuario_metodo_id=c.id,desafio_hash=hash_token("challenge"),expires_at=datetime.now(timezone.utc))); await s.commit()
        assert await reset_user_mfa(s,"mfa_dev") == 1; await s.refresh(c); assert not c.activo and c.disabled_at and c.secreto_cifrado == ""; assert not list(await s.scalars(select(CodigoRecuperacionMfa))); assert (await s.scalar(select(DesafioAutenticacion))).consumed_at
