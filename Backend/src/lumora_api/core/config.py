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
    cors_origins: list[str] = ["http://localhost:8081", "http://localhost:19006"]
    profile_image_dir: str = "storage/profile-images"
    profile_image_base_url: str = "/media/profile-images"

    @model_validator(mode="after")
    def validate_jwt_secret(self) -> "Settings":
        if not self.jwt_secret:
            if self.environment == "production":
                raise ValueError("JWT_SECRET es obligatorio en producción")
            self.jwt_secret = secrets.token_urlsafe(48)
        if len(self.jwt_secret) < 32:
            raise ValueError("JWT_SECRET debe tener al menos 32 caracteres")
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
