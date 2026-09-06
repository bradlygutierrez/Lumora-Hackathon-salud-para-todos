from datetime import datetime, timedelta, timezone
from hashlib import sha256
import secrets
from base64 import urlsafe_b64encode

import jwt
from cryptography.fernet import Fernet
from jwt import InvalidTokenError
from pwdlib import PasswordHash

from lumora_api.core.config import get_settings
from lumora_api.core.exceptions import AuthenticationError

password_hash = PasswordHash.recommended()


def validate_password_policy(password: str) -> str:
    if (
        len(password) < 8
        or len(password) > 128
        or not any(char.islower() for char in password)
        or not any(char.isupper() for char in password)
        or not any(char.isdigit() for char in password)
        or not any(not char.isalnum() for char in password)
    ):
        raise ValueError(
            "La contraseña debe tener entre 8 y 128 caracteres, mayúscula, "
            "minúscula, número y símbolo"
        )
    return password


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def create_access_token(user_id: int, session_id: int | None = None) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
            "sub": str(user_id),
            "iat": now,
            "exp": now + timedelta(minutes=settings.access_token_minutes),
        }
    if session_id is not None:
        payload["sid"] = session_id
    return jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str) -> int:
    return decode_access_claims(token)[0]


def decode_access_claims(token: str) -> tuple[int, int | None]:
    settings = get_settings()
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        return int(payload["sub"]), int(payload["sid"]) if "sid" in payload else None
    except (InvalidTokenError, KeyError, TypeError, ValueError) as error:
        raise AuthenticationError("Token de acceso inválido o expirado") from error


def generate_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return sha256(token.encode()).hexdigest()


def _mfa_cipher() -> Fernet:
    key = sha256(get_settings().jwt_secret.encode()).digest()
    return Fernet(urlsafe_b64encode(key))


def encrypt_mfa_secret(secret: str) -> str:
    return _mfa_cipher().encrypt(secret.encode()).decode()


def decrypt_mfa_secret(encrypted_secret: str) -> str:
    return _mfa_cipher().decrypt(encrypted_secret.encode()).decode()
