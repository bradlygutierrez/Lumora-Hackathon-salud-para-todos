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


def test_cors_origins_are_configurable():
    settings = Settings(
        database_url="sqlite+aiosqlite://",
        cors_origins=["https://app.lumora.example"],
    )
    assert settings.cors_origins == ["https://app.lumora.example"]


def test_email_delivery_settings_are_configurable():
    settings = Settings(database_url="sqlite+aiosqlite://", smtp_username="sender@gmail.com", smtp_app_password="application-secret", email_from="Lumora <sender@gmail.com>")
    assert settings.smtp_host == "smtp.gmail.com"
    assert settings.smtp_port == 587
    assert settings.smtp_app_password.get_secret_value() == "application-secret"
    assert settings.verification_code_minutes == 15
    assert settings.verification_resend_seconds == 60
