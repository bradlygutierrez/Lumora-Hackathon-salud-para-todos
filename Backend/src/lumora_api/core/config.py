from functools import lru_cache
import secrets
from typing import Literal
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Lumora API"
    environment: Literal["development", "test", "production"] = "development"
    database_url: str = Field(description="URL async de PostgreSQL/Neon")
    api_v1_prefix: str = "/api/v1"
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 30
    refresh_token_days: int = 30
    recovery_token_minutes: int = 30
    email_verification_hours: int = 24
    verification_code_minutes: int = 15
    verification_resend_seconds: int = 60
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_app_password: SecretStr = SecretStr("")
    email_from: str = ""
    password_reset_deep_link: str = "lumora://reset-password"
    password_reset_web_url: str = "https://backend-3d83d7df.fastapicloud.dev/reset-password"
    mfa_challenge_minutes: int = 5
    mfa_max_attempts: int = 5
    mfa_recovery_codes: int = 10
    cors_origins: list[str] = [
        "http://localhost:8081",
        "http://localhost:19006",
        "http://127.0.0.1:4173",
    ]
    profile_image_dir: str = "storage/profile-images"
    profile_image_base_url: str = "/media/profile-images"

    # I04 -- almacenamiento durable de imágenes de perfil. "local" (default)
    # usa el filesystem (solo para desarrollo, ver LocalProfileImageStorage);
    # "r2"/"b2" usan Cloudflare R2 / Backblaze B2 vía su API S3-compatible
    # (ver S3CompatibleProfileImageStorage). Nunca se comitean credenciales
    # -- todo esto llega por variables de entorno/secret manager del hosting.
    profile_image_storage_provider: Literal["local", "r2", "b2"] = "local"
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: SecretStr = SecretStr("")
    r2_bucket_name: str = ""
    # URL pública desde la que se sirven los objetos del bucket (dominio
    # propio conectado al bucket, o el *.r2.dev público habilitado en
    # Cloudflare). Sin "/" al final.
    r2_public_base_url: str = ""

    # Backblaze B2 (alternativa a R2 -- no exige tarjeta para la cuenta en
    # sí, solo si se quiere el bucket público, ver más abajo). key_id/
    # application_key son el equivalente de access key id/secret de B2 (se
    # generan en "App Keys" del bucket). region es el sufijo de B2 (ej.
    # "us-west-004", visible en el detalle del bucket) usado para construir
    # el endpoint https://s3.<region>.backblazeb2.com.
    b2_key_id: str = ""
    b2_application_key: SecretStr = SecretStr("")
    b2_bucket_name: str = ""
    b2_region: str = ""
    # Base URL desde la que la app pide las imágenes. Si el bucket es
    # público, apunta directo al proveedor (dominio propio, o el público
    # de R2/B2). Si el bucket es privado (B2 sin tarjeta -- hacerlo público
    # exige historial de pagos o una tarifa única, ver api/media.py), apunta
    # a este mismo backend (ej. https://<host>/media/profile-images) y es
    # media_router quien descarga el objeto con credenciales privadas. Sin
    # "/" al final.
    b2_public_base_url: str = ""

    @model_validator(mode="after")
    def validate_jwt_secret(self) -> "Settings":
        if not self.jwt_secret:
            if self.environment == "production":
                raise ValueError("JWT_SECRET es obligatorio en producción")
            self.jwt_secret = secrets.token_urlsafe(48)
        if len(self.jwt_secret) < 32:
            raise ValueError("JWT_SECRET debe tener al menos 32 caracteres")
        return self

    @model_validator(mode="after")
    def validate_r2_storage_config(self) -> "Settings":
        if self.profile_image_storage_provider != "r2":
            return self
        missing = [
            name
            for name, value in (
                ("R2_ACCOUNT_ID", self.r2_account_id),
                ("R2_ACCESS_KEY_ID", self.r2_access_key_id),
                ("R2_SECRET_ACCESS_KEY", self.r2_secret_access_key.get_secret_value()),
                ("R2_BUCKET_NAME", self.r2_bucket_name),
                ("R2_PUBLIC_BASE_URL", self.r2_public_base_url),
            )
            if not value
        ]
        if missing:
            raise ValueError(
                "PROFILE_IMAGE_STORAGE_PROVIDER=r2 requiere: " + ", ".join(missing)
            )
        return self

    @model_validator(mode="after")
    def validate_b2_storage_config(self) -> "Settings":
        if self.profile_image_storage_provider != "b2":
            return self
        missing = [
            name
            for name, value in (
                ("B2_KEY_ID", self.b2_key_id),
                ("B2_APPLICATION_KEY", self.b2_application_key.get_secret_value()),
                ("B2_BUCKET_NAME", self.b2_bucket_name),
                ("B2_REGION", self.b2_region),
                ("B2_PUBLIC_BASE_URL", self.b2_public_base_url),
            )
            if not value
        ]
        if missing:
            raise ValueError(
                "PROFILE_IMAGE_STORAGE_PROVIDER=b2 requiere: " + ", ".join(missing)
            )
        return self

    @field_validator("database_url")
    @classmethod
    def use_async_postgres_driver(cls, url: str) -> str:
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        if not url.startswith("postgresql+asyncpg://"):
            return url

        parts = urlsplit(url)
        query = [
            ("ssl" if key == "sslmode" else key, value)
            for key, value in parse_qsl(parts.query, keep_blank_values=True)
            if key != "channel_binding"
        ]
        return urlunsplit(parts._replace(query=urlencode(query)))

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
