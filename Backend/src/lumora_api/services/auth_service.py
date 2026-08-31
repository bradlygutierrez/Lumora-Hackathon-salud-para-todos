from datetime import datetime, timedelta, timezone
import logging
import secrets

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from lumora_api.core.config import get_settings
from lumora_api.core.exceptions import (
    AuthenticationError,
    InvalidTokenError,
    ResourceConflictError,
    ResourceNotFoundError,
    MfaRequiredError,
    RateLimitError,
)
from lumora_api.core.security import (
    create_access_token,
    generate_token,
    hash_password,
    hash_token,
    validate_password_policy,
    verify_password,
)
from lumora_api.models import (
    ContactoEmergencia,
    Direccion,
    Paciente,
    Permiso,
    Persona,
    Rol,
    TokenRecuperacion,
    Usuario,
    VerificacionCorreo,
    IntentoInicioSesion,
    SesionUsuario,
)
from lumora_api.repositories.auth_repository import AuthRepository
from lumora_api.schemas.auth import CaregiverRegistrationRequest, PatientRegistrationRequest
from lumora_api.services.email_service import EmailService

logger = logging.getLogger(__name__)


def _expired(expires_at: datetime) -> bool:
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at <= datetime.now(timezone.utc)


class AuthService:
    def __init__(self, repository: AuthRepository, email_service: EmailService | None = None) -> None:
        self.repository = repository
        self.email_service = email_service

    async def register_patient(self, data: PatientRegistrationRequest) -> dict:
        if await self.repository.user_by_email(str(data.email)):
            raise ResourceConflictError("El correo ya está registrado")
        if await self.repository.user_by_username(data.username):
            raise ResourceConflictError("El nombre de usuario ya está registrado")
        if not await self.repository.sex_exists(data.sex_id):
            raise ResourceNotFoundError("El sexo indicado no existe")
        if data.blood_type_id is not None and not await self.repository.blood_type_exists(data.blood_type_id):
            raise ResourceNotFoundError("El tipo de sangre indicado no existe")
        role = await self.repository.patient_role()
        if role is None:
            raise ResourceNotFoundError("El rol Paciente no está configurado")

        session = self.repository.session
        code = f"{secrets.randbelow(1_000_000):06d}"
        try:
            person = Persona(
                nombres=data.first_names,
                apellidos=data.last_names,
                fecha_nacimiento=data.birth_date,
                telefono=data.phone,
                sexo_id=data.sex_id,
            )
            user = Usuario(
                persona=person,
                email=str(data.email).lower(),
                username=data.username,
                password_hash=hash_password(data.password),
                roles=[role],
            )
            address = Direccion(
                persona=person,
                linea_1=data.address.line_1,
                ciudad=data.address.city,
                departamento=data.address.department,
                pais=data.address.country,
                codigo_postal=data.address.postal_code,
                es_principal=True,
            )
            patient = Paciente(persona=person, tipo_sangre_id=data.blood_type_id)
            contact = ContactoEmergencia(
                paciente=patient,
                nombre=data.emergency_contact.name,
                parentesco=data.emergency_contact.relationship,
                telefono=data.emergency_contact.phone,
            )
            verification = VerificacionCorreo(
                usuario=user,
                token_hash=hash_token(code),
                expires_at=datetime.now(timezone.utc)
                + timedelta(minutes=get_settings().verification_code_minutes),
            )
            session.add_all([person, user, address, patient, contact, verification])
            await session.flush()
            response = {
                "user_id": user.id,
                "person_id": person.id,
                "patient_id": patient.id,
                "emergency_contact_id": contact.id,
                "email_verified": False,
                "status": "pending_email_verification",
            }
            await session.commit()
        except IntegrityError as error:
            await session.rollback()
            raise ResourceConflictError("El correo o usuario ya está registrado") from error
        except Exception:
            await session.rollback()
            raise

        sender = self.email_service or EmailService()
        try:
            sender.send_verification_code(str(data.email), code)
        except RuntimeError:
            logger.exception("Email verification delivery failed for user_id=%s", user.id)
        return response

    async def register_caregiver(self, data: CaregiverRegistrationRequest) -> dict:
        if await self.repository.user_by_email(str(data.email)):
            raise ResourceConflictError("El correo ya está registrado")
        if await self.repository.user_by_username(data.username):
            raise ResourceConflictError("El nombre de usuario ya está registrado")
        if not await self.repository.sex_exists(data.sex_id):
            raise ResourceNotFoundError("El sexo indicado no existe")
        role = await self.repository.caregiver_role()
        if role is None:
            raise ResourceNotFoundError("El rol Cuidador no está configurado")

        session = self.repository.session
        code = f"{secrets.randbelow(1_000_000):06d}"
        try:
            person = Persona(
                nombres=data.first_names,
                apellidos=data.last_names,
                fecha_nacimiento=data.birth_date,
                telefono=data.phone,
                sexo_id=data.sex_id,
            )
            user = Usuario(
                persona=person,
                email=str(data.email).lower(),
                username=data.username,
                password_hash=hash_password(data.password),
                roles=[role],
            )
            address = Direccion(
                persona=person,
                linea_1=data.address.line_1,
                ciudad=data.address.city,
                departamento=data.address.department,
                pais=data.address.country,
                codigo_postal=data.address.postal_code,
                es_principal=True,
            )
            verification = VerificacionCorreo(
                usuario=user,
                token_hash=hash_token(code),
                expires_at=datetime.now(timezone.utc)
                + timedelta(minutes=get_settings().verification_code_minutes),
            )
            session.add_all([person, user, address, verification])
            await session.flush()
            response = {
                "user_id": user.id,
                "person_id": person.id,
                "email_verified": False,
                "status": "pending_email_verification",
            }
            await session.commit()
        except IntegrityError as error:
            await session.rollback()
            raise ResourceConflictError("El correo o usuario ya está registrado") from error
        except Exception:
            await session.rollback()
            raise

        sender = self.email_service or EmailService()
        try:
            sender.send_verification_code(str(data.email), code)
        except RuntimeError:
            logger.exception("Email verification delivery failed for user_id=%s", user.id)
        return response

    async def authenticate(self, login: str, password: str) -> str:
        user = await self.authenticate_user(login, password)
        if await self.repository.has_active_mfa(user.id):
            raise MfaRequiredError("Se requiere un segundo factor de autenticación")
        return create_access_token(user.id)

    async def authenticate_user(
        self, login: str, password: str, ip: str | None = None, user_agent: str | None = None
    ) -> Usuario:
        user = await self.repository.user_by_login(login)
        if user is None or not verify_password(password, user.password_hash):
            self.repository.session.add(IntentoInicioSesion(
                login=login.lower(), usuario_id=user.id if user else None, exitoso=False,
                motivo="credenciales_incorrectas", ip=ip, user_agent=user_agent,
            ))
            await self.repository.session.commit()
            raise AuthenticationError("Credenciales incorrectas")
        self.repository.session.add(IntentoInicioSesion(
            login=login.lower(), usuario_id=user.id, exitoso=True, ip=ip, user_agent=user_agent,
        ))
        await self.repository.session.commit()
        return user

    async def login(self, login: str, password: str, ip: str | None, user_agent: str | None) -> dict:
        user = await self.authenticate_user(login, password, ip, user_agent)
        if await self.repository.has_active_mfa(user.id):
            from lumora_api.repositories.mfa_repository import MfaRepository
            from lumora_api.services.mfa_service import MfaService

            challenge = await MfaService(
                MfaRepository(self.repository.session)
            ).create_challenge_for_user(user)
            return {"mfa_required": True, **challenge}
        return {
            "mfa_required": False,
            **await self.create_session(user.id, ip, user_agent),
        }

    async def create_session(self, user_id: int, ip: str | None, user_agent: str | None) -> dict:
        raw = generate_token()
        session = SesionUsuario(
            usuario_id=user_id, refresh_token_hash=hash_token(raw), ip=ip,
            user_agent=user_agent, expires_at=datetime.now(timezone.utc)
            + timedelta(days=get_settings().refresh_token_days),
        )
        self.repository.session.add(session)
        await self.repository.session.flush()
        await self.repository.session.commit()
        return {"access_token": create_access_token(user_id, session.id), "refresh_token": raw}

    async def refresh(self, raw_token: str, ip: str | None, user_agent: str | None) -> dict:
        session = await self.repository.session_by_hash(hash_token(raw_token))
        if session is None or session.revoked_at is not None or _expired(session.expires_at):
            raise InvalidTokenError("Refresh token inválido, expirado o revocado")
        replacement = generate_token()
        session.refresh_token_hash = hash_token(replacement)
        session.last_used_at = datetime.now(timezone.utc)
        session.ip, session.user_agent = ip, user_agent
        await self.repository.session.commit()
        return {"access_token": create_access_token(session.usuario_id, session.id), "refresh_token": replacement}

    async def logout(self, user_id: int, session_id: int) -> None:
        session = await self.repository.active_session(session_id, user_id)
        if session is None:
            raise InvalidTokenError("Sesión inválida o revocada")
        session.revoked_at = datetime.now(timezone.utc)
        await self.repository.session.commit()

    async def logout_all(self, user_id: int) -> None:
        await self.repository.revoke_all(user_id)
        await self.repository.session.commit()

    async def sessions(self, user_id: int, current_session_id: int) -> list[dict]:
        sessions = await self.repository.active_sessions(user_id)
        return [
            {
                "id": item.id,
                "ip": item.ip,
                "user_agent": item.user_agent,
                "created_at": item.created_at,
                "last_used_at": item.last_used_at,
                "expires_at": item.expires_at,
                "device_name": self._device_name(item.user_agent),
                "platform": self._platform(item.user_agent),
                "ip_address": item.ip,
                "last_activity_at": item.last_used_at,
                "is_current": item.id == current_session_id,
            }
            for item in sessions
        ]

    @staticmethod
    def _platform(user_agent: str | None) -> str:
        value = (user_agent or "").lower()
        for marker, name in (("android", "Android"), ("iphone", "iOS"), ("windows", "Windows"), ("macintosh", "macOS"), ("linux", "Linux")):
            if marker in value:
                return name
        return "Unknown"

    @staticmethod
    def _device_name(user_agent: str | None) -> str:
        return (user_agent or "Unknown")[:120]

    async def revoke_session(self, user_id: int, session_id: int) -> None:
        owned = await self.repository.owned_session(session_id, user_id)
        if owned is None:
            raise ResourceNotFoundError("Sesión no encontrada")
        if owned.revoked_at is None:
            owned.revoked_at = datetime.now(timezone.utc)
            await self.repository.session.commit()

    async def logout_others(self, user_id: int, current_session_id: int) -> None:
        await self.repository.revoke_others(user_id, current_session_id)
        await self.repository.session.commit()

    async def create_recovery(self, email: str) -> str | None:
        user = await self.repository.user_by_email(email)
        if user is None:
            return None
        raw_token = generate_token()
        self.repository.session.add(
            TokenRecuperacion(
                usuario_id=user.id,
                token_hash=hash_token(raw_token),
                expires_at=datetime.now(timezone.utc)
                + timedelta(minutes=get_settings().recovery_token_minutes),
            )
        )
        await self.repository.session.commit()
        sender = self.email_service or EmailService()
        try:
            sender.send_password_reset(user.email, raw_token)
        except RuntimeError:
            logger.exception("Password recovery email delivery failed for user_id=%s", user.id)
        return raw_token

    async def reset_password(self, raw_token: str, new_password: str) -> None:
        validate_password_policy(new_password)
        token = await self.repository.recovery_by_hash(hash_token(raw_token))
        if token is None or token.consumed_at is not None or _expired(token.expires_at):
            raise InvalidTokenError("Token inválido, expirado o ya utilizado")
        user = await self.repository.user_by_id(token.usuario_id)
        if user is None:
            raise InvalidTokenError("Token inválido, expirado o ya utilizado")
        user.password_hash = hash_password(new_password)
        token.consumed_at = datetime.now(timezone.utc)
        await self.repository.revoke_all(user.id)
        await self.repository.session.commit()

    async def change_password(
        self,
        user: Usuario,
        current_session_id: int,
        current_password: str,
        new_password: str,
    ) -> None:
        if not verify_password(current_password, user.password_hash):
            raise AuthenticationError("Credenciales incorrectas")
        validate_password_policy(new_password)
        if verify_password(new_password, user.password_hash):
            raise ResourceConflictError("La nueva contraseña debe ser diferente")
        user.password_hash = hash_password(new_password)
        await self.repository.revoke_others(user.id, current_session_id)
        await self.repository.session.commit()

    async def create_email_verification(self, user: Usuario) -> str:
        raw_token = generate_token()
        self.repository.session.add(
            VerificacionCorreo(
                usuario_id=user.id,
                token_hash=hash_token(raw_token),
                expires_at=datetime.now(timezone.utc)
                + timedelta(hours=get_settings().email_verification_hours),
            )
        )
        await self.repository.session.commit()
        return raw_token

    async def verify_email(self, raw_token: str) -> None:
        token = await self.repository.verification_by_hash(hash_token(raw_token))
        if token is None or token.consumed_at is not None or _expired(token.expires_at):
            raise InvalidTokenError("Token inválido, expirado o ya utilizado")
        user = await self.repository.user_by_id(token.usuario_id)
        if user is None:
            raise InvalidTokenError("Token inválido, expirado o ya utilizado")
        user.email_verificado = True
        token.consumed_at = datetime.now(timezone.utc)
        await self.repository.session.commit()

    async def verify_email_code(self, email: str, code: str) -> None:
        user = await self.repository.user_by_email(email)
        if user is None:
            raise InvalidTokenError("Código inválido, expirado o ya utilizado")
        token = await self.repository.verification_by_user_hash(user.id, hash_token(code))
        if token is None or token.consumed_at is not None or _expired(token.expires_at):
            raise InvalidTokenError("Código inválido, expirado o ya utilizado")
        user.email_verificado = True
        await self.repository.consume_verifications(user.id)
        await self.repository.session.commit()

    async def resend_verification(self, email: str, enforce_cooldown: bool = True) -> None:
        user = await self.repository.user_by_email(email)
        if user is None or user.email_verificado:
            return
        latest = await self.repository.latest_verification(user.id)
        if enforce_cooldown and latest is not None:
            created_at = latest.created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            elapsed = (datetime.now(timezone.utc) - created_at).total_seconds()
            if elapsed < get_settings().verification_resend_seconds:
                raise RateLimitError("Espera antes de solicitar otro código")
        code = f"{secrets.randbelow(1_000_000):06d}"
        await self.repository.consume_verifications(user.id)
        self.repository.session.add(
            VerificacionCorreo(
                usuario_id=user.id,
                token_hash=hash_token(code),
                expires_at=datetime.now(timezone.utc)
                + timedelta(minutes=get_settings().verification_code_minutes),
            )
        )
        await self.repository.session.commit()
        sender = self.email_service or EmailService()
        sender.send_verification_code(user.email, code)


class RbacService:
    def __init__(self, repository: AuthRepository) -> None:
        self.repository = repository

    async def _user(self, user_id: int) -> Usuario:
        user = await self.repository.user_by_id(user_id)
        if user is None:
            raise ResourceNotFoundError(f"Usuario con id {user_id} no existe")
        return user

    async def _role(self, role_id: int) -> Rol:
        role = await self.repository.session.get(Rol, role_id)
        if role is None:
            raise ResourceNotFoundError(f"Rol con id {role_id} no existe")
        return role

    async def list_user_roles(self, user_id: int) -> list[Rol]:
        return (await self._user(user_id)).roles

    async def add_user_role(self, user_id: int, role_id: int) -> list[Rol]:
        user, role = await self._user(user_id), await self._role(role_id)
        if role in user.roles:
            raise ResourceConflictError("El usuario ya tiene ese rol")
        user.roles.append(role)
        await self.repository.session.commit()
        return user.roles

    async def remove_user_role(self, user_id: int, role_id: int) -> None:
        user, role = await self._user(user_id), await self._role(role_id)
        if role not in user.roles:
            raise ResourceNotFoundError("El usuario no tiene ese rol")
        user.roles.remove(role)
        await self.repository.session.commit()

    async def list_role_permissions(self, role_id: int) -> list[Permiso]:
        return (await self._role(role_id)).permisos

    async def add_role_permission(self, role_id: int, permission_id: int) -> list[Permiso]:
        role = await self._role(role_id)
        permission = await self.repository.session.get(Permiso, permission_id)
        if permission is None:
            raise ResourceNotFoundError(f"Permiso con id {permission_id} no existe")
        if permission in role.permisos:
            raise ResourceConflictError("El rol ya tiene ese permiso")
        role.permisos.append(permission)
        await self.repository.session.commit()
        return role.permisos

    async def remove_role_permission(self, role_id: int, permission_id: int) -> None:
        role = await self._role(role_id)
        permission = await self.repository.session.get(Permiso, permission_id)
        if permission is None or permission not in role.permisos:
            raise ResourceNotFoundError("El rol no tiene ese permiso")
        role.permisos.remove(permission)
        await self.repository.session.commit()
