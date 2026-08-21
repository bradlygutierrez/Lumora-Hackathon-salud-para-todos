import pytest

from lumora_api.core.config import Settings


def test_neon_url_uses_asyncpg_driver():
    settings = Settings(
        database_url=(
            "postgresql://user:password@host/database"
            "?sslmode=require&channel_binding=require"
        )
    )

    assert settings.database_url == (
        "postgresql+asyncpg://user:password@host/database?ssl=require"
    )


def test_production_requires_a_persistent_jwt_secret():
    with pytest.raises(ValueError, match="JWT_SECRET"):
        Settings(
            database_url="sqlite+aiosqlite://",
            environment="production",
            jwt_secret="",
        )
