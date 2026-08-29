from datetime import datetime, timedelta, timezone
import secrets
import pyotp
from lumora_api.core.config import get_settings
from lumora_api.core.exceptions import InvalidMfaCodeError, InvalidTokenError, ResourceConflictError, ResourceNotFoundError
from lumora_api.core.security import decrypt_mfa_secret, encrypt_mfa_secret, generate_token, hash_token
from lumora_api.models import CodigoRecuperacionMfa, DesafioAutenticacion, Usuario, UsuarioMetodoMfa
from lumora_api.repositories.auth_repository import AuthRepository
from lumora_api.repositories.mfa_repository import MfaRepository
from lumora_api.services.auth_service import AuthService

def _expired(value):
    if value.tzinfo is None: value=value.replace(tzinfo=timezone.utc)
    return value <= datetime.now(timezone.utc)

def _codes(): return [secrets.token_urlsafe(9)[:12] for _ in range(get_settings().mfa_recovery_codes)]

class MfaService:
    def __init__(self, repository): self.repository=repository
    async def methods(self,user_id):
        configured={m.metodo_id:m for m in await self.repository.configured_methods(user_id)}
        return [{"id":configured[m.id].id if m.id in configured else None,"metodo_id":m.id,"nombre":m.nombre,"activo":configured[m.id].activo if m.id in configured else False} for m in await self.repository.supported_methods()]
    async def setup(self,user,method_id):
        method=await self.repository.catalog_method(method_id)
        if method is None or method.nombre not in ("totp","email"): raise ResourceNotFoundError("Método MFA no disponible")
        configured=await self.repository.by_catalog_method(user.id,method_id)
        if configured and configured.activo: raise ResourceConflictError("El método MFA ya está activo")
        if method.nombre=="email":
            if not user.email_verificado: raise ResourceConflictError("El correo debe estar verificado")
            configured=configured or UsuarioMetodoMfa(usuario_id=user.id,metodo_id=method_id,secreto_cifrado="",activo=False)
            if configured.id is None: self.repository.session.add(configured); await self.repository.session.flush()
            await self.repository.delete_recovery_codes(configured.id); await self.repository.consume_open_challenges(configured.id)
            raw=generate_token(); code=f"{secrets.randbelow(1000000):06d}"; mins=get_settings().mfa_challenge_minutes
            self.repository.session.add(DesafioAutenticacion(usuario_id=user.id,usuario_metodo_id=configured.id,desafio_hash=hash_token(raw),codigo_hash=hash_token(code),expires_at=datetime.now(timezone.utc)+timedelta(minutes=mins),max_intentos=get_settings().mfa_max_attempts))
            await self.repository.session.commit()
            from lumora_api.services.email_service import EmailService
            EmailService().send_mfa_code(user.email,code)
            return {"method_id":configured.id,"challenge_token":raw,"expires_in":mins*60}
        secret=pyotp.random_base32()
        configured=configured or UsuarioMetodoMfa(usuario_id=user.id,metodo_id=method_id,secreto_cifrado=encrypt_mfa_secret(secret),activo=False)
        if configured.id is None: self.repository.session.add(configured)
        else: configured.secreto_cifrado=encrypt_mfa_secret(secret); configured.activo=False; configured.disabled_at=None; await self.repository.delete_recovery_codes(configured.id)
        await self.repository.session.flush(); await self.repository.session.commit()
        return {"method_id":configured.id,"secret":secret,"provisioning_uri":pyotp.TOTP(secret).provisioning_uri(name=user.email,issuer_name="Lumora")}
    async def confirm_setup(self,user_id,method_id,code):
        configured=await self.repository.configured_method(user_id,method_id)
        if configured is None or configured.activo or configured.metodo.nombre not in ("totp","email"): raise ResourceNotFoundError("Configuración MFA no encontrada")
        if configured.metodo.nombre=="totp":
            valid=pyotp.TOTP(decrypt_mfa_secret(configured.secreto_cifrado)).verify(code,valid_window=1)
        else:
            challenge=await self.repository.latest_open_challenge(configured.id)
            valid=challenge is not None and not _expired(challenge.expires_at) and challenge.codigo_hash==hash_token(code)
            if valid: challenge.consumed_at=datetime.now(timezone.utc)
        if not valid: raise InvalidMfaCodeError("Código MFA incorrecto")
        configured.activo=True; configured.disabled_at=None; await self.repository.delete_recovery_codes(configured.id)
        raw=_codes(); self.repository.session.add_all([CodigoRecuperacionMfa(usuario_metodo_id=configured.id,codigo_hash=hash_token(c)) for c in raw]); await self.repository.session.commit()
        return {"method_id":configured.id,"recovery_codes":raw}
    async def create_challenge(self,login,password):
        user=await AuthService(AuthRepository(self.repository.session)).authenticate_user(login,password); return await self.create_challenge_for_user(user)
    async def create_challenge_for_user(self,user):
        configured=await self.repository.active_method(user.id)
        if configured is None: raise ResourceNotFoundError("El usuario no tiene MFA activo")
        raw=generate_token(); mins=get_settings().mfa_challenge_minutes; values=dict(usuario_id=user.id,usuario_metodo_id=configured.id,desafio_hash=hash_token(raw),expires_at=datetime.now(timezone.utc)+timedelta(minutes=mins),max_intentos=get_settings().mfa_max_attempts)
        if configured.metodo.nombre=="email":
            code=f"{secrets.randbelow(1000000):06d}"; values["codigo_hash"]=hash_token(code)
            from lumora_api.services.email_service import EmailService
            EmailService().send_mfa_code(user.email,code)
        self.repository.session.add(DesafioAutenticacion(**values)); await self.repository.session.commit(); return {"challenge_token":raw,"expires_in":mins*60,"method":configured.metodo.nombre}
    async def _open_challenge(self,raw):
        c=await self.repository.challenge(hash_token(raw))
        if c is None or c.consumed_at is not None or c.intentos>=c.max_intentos: raise InvalidTokenError("Desafío inválido o consumido")
        if _expired(c.expires_at): c.consumed_at=datetime.now(timezone.utc); await self.repository.session.commit(); raise InvalidTokenError("Desafío expirado")
        return c
    async def _failed(self,c):
        c.intentos+=1
        if c.intentos>=c.max_intentos: c.consumed_at=datetime.now(timezone.utc)
        await self.repository.session.commit(); raise InvalidMfaCodeError("Código MFA incorrecto")
    async def verify(self,raw,code,ip=None,user_agent=None):
        c=await self._open_challenge(raw)
        valid=(c.usuario_metodo.metodo.nombre=="email" and c.codigo_hash==hash_token(code)) if c.usuario_metodo.metodo.nombre=="email" else pyotp.TOTP(decrypt_mfa_secret(c.usuario_metodo.secreto_cifrado)).verify(code,valid_window=1)
        if not valid: await self._failed(c)
        c.consumed_at=datetime.now(timezone.utc); await self.repository.session.commit(); return await AuthService(AuthRepository(self.repository.session)).create_session(c.usuario_id,ip,user_agent)
    async def recover(self,raw,recovery_code,ip=None,user_agent=None):
        c=await self._open_challenge(raw); rc=await self.repository.recovery_code(c.usuario_metodo_id,hash_token(recovery_code))
        if rc is None or rc.used_at is not None: await self._failed(c)
        now=datetime.now(timezone.utc); rc.used_at=now; c.consumed_at=now; await self.repository.session.commit(); return await AuthService(AuthRepository(self.repository.session)).create_session(c.usuario_id,ip,user_agent)
    async def disable(self,user_id,configured_id):
        c=await self.repository.configured_method(user_id,configured_id)
        if c is None or not c.activo: raise ResourceNotFoundError("Método MFA no encontrado")
        c.activo=False; c.disabled_at=datetime.now(timezone.utc); await self.repository.consume_open_challenges(c.id); await self.repository.delete_recovery_codes(c.id); await self.repository.session.commit()
