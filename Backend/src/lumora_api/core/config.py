from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Lumora API"
    environment: Literal["development", "test", "production"] = "development"
    database_url: str = Field(description="URL async de PostgreSQL/Neon")
    api_v1_prefix: str = "/api/v1"

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
