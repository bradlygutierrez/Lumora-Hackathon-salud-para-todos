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
