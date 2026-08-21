from functools import lru_cache
from typing import Literal
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Lumora API"
    environment: Literal["development", "test", "production"] = "development"
    database_url: str = Field(description="URL async de PostgreSQL/Neon")
    api_v1_prefix: str = "/api/v1"

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
