from datetime import datetime, timedelta, timezone

import pyotp

from lumora_api.core.config import get_settings
from lumora_api.core.exceptions import (
    InvalidMfaCodeError,
    InvalidTokenError,
    ResourceConflictError,
    ResourceNotFoundError,
)
from lumora_api.core.security import (
    decrypt_mfa_secret,
    encrypt_mfa_secret,
    generate_token,
    hash_token,
)
from lumora_api.models import (
    CodigoRecuperacionMfa,
    DesafioAutenticacion,
    Usuario,
    UsuarioMetodoMfa,
)
from lumora_api.repositories.auth_repository import AuthRepository
from lumora_api.repositories.mfa_repository import MfaRepository
from lumora_api.services.auth_service import AuthService


def _expired(value: datetime) -> bool:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value <= datetime.now(timezone.utc)


class MfaService:
    def __init__(self, repository: MfaRepository) -> None:
        self.repository = repository

    async def methods(self, user_id: int) -> list[dict]:
        methods = await self.repository.configured_methods(user_id)
        return [
            {
                "id": method.id,
                "metodo_id": method.metodo_id,
                "nombre": method.metodo.nombre,
                "activo": method.activo,
            }
            for method in methods
        ]

    async def setup(self, user: Usuario, method_id: int) -> dict:
        method = await self.repository.catalog_method(method_id)
        if method is None or method.nombre != "totp":
            raise ResourceNotFoundError("Método MFA no disponible")
        configured = await self.repository.by_catalog_method(user.id, method_id)
        if configured is not None and configured.activo:
            raise ResourceConflictError("El método MFA ya está activo")

        secret = pyotp.random_base32()
        recovery_codes = [
            generate_token()[:12] for _ in range(get_settings().mfa_recovery_codes)
        ]
        if configured is None:
            configured = UsuarioMetodoMfa(
                usuario_id=user.id,
                metodo_id=method_id,
                secreto_cifrado=encrypt_mfa_secret(secret),
            )
            self.repository.session.add(configured)
            await self.repository.session.flush()
        else:
            configured.secreto_cifrado = encrypt_mfa_secret(secret)
            configured.activo = True
            configured.disabled_at = None
            await self.repository.delete_recovery_codes(configured.id)
        self.repository.session.add_all(
            [
                CodigoRecuperacionMfa(
                    usuario_metodo_id=configured.id, codigo_hash=hash_token(code)
                )
                for code in recovery_codes
            ]
        )
        await self.repository.session.commit()
        return {
            "method_id": configured.id,
            "secret": secret,
            "provisioning_uri": pyotp.TOTP(secret).provisioning_uri(
                name=user.email, issuer_name="Lumora"
            ),
            "recovery_codes": recovery_codes,
        }

    async def create_challenge(self, login: str, password: str) -> dict:
        auth_repository = AuthRepository(self.repository.session)
        user = await AuthService(auth_repository).authenticate_user(login, password)
        return await self.create_challenge_for_user(user)

    async def create_challenge_for_user(self, user: Usuario) -> dict:
        configured = await self.repository.active_method(user.id)
        if configured is None:
            raise ResourceNotFoundError("El usuario no tiene MFA activo")
        raw_token = generate_token()
        minutes = get_settings().mfa_challenge_minutes
        self.repository.session.add(
            DesafioAutenticacion(
                usuario_id=user.id,
                usuario_metodo_id=configured.id,
                desafio_hash=hash_token(raw_token),
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=minutes),
                max_intentos=get_settings().mfa_max_attempts,
            )
        )
        await self.repository.session.commit()
        return {"challenge_token": raw_token, "expires_in": minutes * 60}

    async def _open_challenge(self, raw_token: str) -> DesafioAutenticacion:
        challenge = await self.repository.challenge(hash_token(raw_token))
        if (
            challenge is None
            or challenge.consumed_at is not None
            or challenge.intentos >= challenge.max_intentos
        ):
            raise InvalidTokenError("Desafío inválido o consumido")
        if _expired(challenge.expires_at):
            challenge.consumed_at = datetime.now(timezone.utc)
            await self.repository.session.commit()
            raise InvalidTokenError("Desafío expirado")
        return challenge

    async def _failed_attempt(self, challenge: DesafioAutenticacion) -> None:
        challenge.intentos += 1
        if challenge.intentos >= challenge.max_intentos:
            challenge.consumed_at = datetime.now(timezone.utc)
        await self.repository.session.commit()
        raise InvalidMfaCodeError("Código MFA incorrecto")

    async def verify(self, raw_token: str, code: str, ip: str | None = None,
                     user_agent: str | None = None) -> dict:
        challenge = await self._open_challenge(raw_token)
        secret = decrypt_mfa_secret(challenge.usuario_metodo.secreto_cifrado)
        if not pyotp.TOTP(secret).verify(code, valid_window=1):
            await self._failed_attempt(challenge)
        challenge.consumed_at = datetime.now(timezone.utc)
        await self.repository.session.commit()
        return await AuthService(AuthRepository(self.repository.session)).create_session(
            challenge.usuario_id, ip, user_agent
        )

    async def recover(self, raw_token: str, recovery_code: str, ip: str | None = None,
                      user_agent: str | None = None) -> dict:
        challenge = await self._open_challenge(raw_token)
        code = await self.repository.recovery_code(
            challenge.usuario_metodo_id, hash_token(recovery_code)
        )
        if code is None or code.used_at is not None:
            await self._failed_attempt(challenge)
        now = datetime.now(timezone.utc)
        code.used_at = now
        challenge.consumed_at = now
        await self.repository.session.commit()
        return await AuthService(AuthRepository(self.repository.session)).create_session(
            challenge.usuario_id, ip, user_agent
        )

    async def disable(self, user_id: int, configured_id: int) -> None:
        configured = await self.repository.configured_method(user_id, configured_id)
        if configured is None or not configured.activo:
            raise ResourceNotFoundError("Método MFA no encontrado")
        configured.activo = False
        configured.disabled_at = datetime.now(timezone.utc)
        await self.repository.consume_open_challenges(configured.id)
        await self.repository.session.commit()
