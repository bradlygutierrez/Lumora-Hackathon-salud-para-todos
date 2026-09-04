"""I06 -- tests de parsing de configuracion, creacion del engine y un smoke
de concurrencia razonable sobre el mecanismo de pool (QueuePool) que usa
SQLAlchemy tanto para asyncpg/Postgres como para el resto de sus drivers.

No se conecta a un Postgres/Neon real: create_async_engine es perezoso (no
abre conexiones hasta el primer checkout), asi que los tests de parsing y
creacion del engine corren instantaneos y sin red. El smoke de concurrencia
si abre conexiones de verdad, pero contra un SQLite temporal en disco (no
:memory:, para que el QueuePool comparta un archivo real entre tareas) con
el mismo poolclass (AsyncAdaptedQueuePool) y los mismos parametros que usa
build_engine en produccion -- valida el comportamiento del pool en si
(espera, reuso, timeout claro) sin depender de tener Neon disponible en CI.
"""

import asyncio

import pytest
from sqlalchemy.exc import TimeoutError as PoolTimeoutError
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import AsyncAdaptedQueuePool

from lumora_api.core.config import Settings
from lumora_api.db.session import build_engine


def _settings(**overrides) -> Settings:
    overrides.setdefault("database_url", "postgresql+asyncpg://user:pass@example.invalid/db")
    overrides.setdefault("jwt_secret", "a" * 32)
    return Settings(**overrides)


def test_pool_settings_default_to_conservative_values():
    settings = _settings()
    assert settings.db_pool_size == 5
    assert settings.db_max_overflow == 5
    assert settings.db_pool_timeout_seconds == 10
    assert settings.db_pool_recycle_seconds == 300


def test_pool_settings_parse_overrides_from_env(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://user:pass@example.invalid/db")
    monkeypatch.setenv("JWT_SECRET", "b" * 32)
    monkeypatch.setenv("DB_POOL_SIZE", "8")
    monkeypatch.setenv("DB_MAX_OVERFLOW", "12")
    monkeypatch.setenv("DB_POOL_TIMEOUT_SECONDS", "3")
    monkeypatch.setenv("DB_POOL_RECYCLE_SECONDS", "600")

    settings = Settings()

    assert settings.db_pool_size == 8
    assert settings.db_max_overflow == 12
    assert settings.db_pool_timeout_seconds == 3
    assert settings.db_pool_recycle_seconds == 600


@pytest.mark.asyncio
async def test_build_engine_wires_pool_settings_into_the_real_engine():
    settings = _settings(
        db_pool_size=3, db_max_overflow=2, db_pool_timeout_seconds=7, db_pool_recycle_seconds=123
    )
    engine = build_engine(settings)
    try:
        pool = engine.pool
        assert pool.size() == 3
        assert pool._max_overflow == 2
        assert pool._timeout == 7
        assert pool._recycle == 123
        assert pool._pre_ping is True
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_build_engine_skips_pool_sizing_kwargs_for_sqlite():
    # sqlite (StaticPool/NullPool) no acepta pool_size/max_overflow/
    # pool_timeout -- solo se usa como DATABASE_URL en tests
    # (tests/conftest.py fuerza sqlite antes de importar db.session para
    # no intentar conectar a Neon durante la coleccion). build_engine debe
    # poder crear el engine igual, sin romper, para esos casos.
    settings = _settings(database_url="sqlite+aiosqlite:///:memory:")
    engine = build_engine(settings)
    try:
        async with engine.connect() as conn:
            await conn.exec_driver_sql("SELECT 1")
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_pool_serves_concurrent_requests_up_to_its_capacity(tmp_path):
    db_path = tmp_path / "i06_pool_smoke.sqlite3"
    engine = create_async_engine(
        f"sqlite+aiosqlite:///{db_path}",
        poolclass=AsyncAdaptedQueuePool,
        pool_size=2,
        max_overflow=1,
        pool_timeout=2,
    )
    try:
        async def hold_connection():
            async with engine.connect() as conn:
                await conn.exec_driver_sql("SELECT 1")
                await asyncio.sleep(0.2)

        # capacidad total = pool_size + max_overflow = 3: las 3 en simultaneo
        # deben poder atenderse sin que ninguna espere el pool_timeout.
        await asyncio.wait_for(
            asyncio.gather(hold_connection(), hold_connection(), hold_connection()),
            timeout=2,
        )
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_pool_exhaustion_raises_a_clear_timeout_instead_of_hanging_forever(tmp_path):
    db_path = tmp_path / "i06_pool_exhaustion.sqlite3"
    engine = create_async_engine(
        f"sqlite+aiosqlite:///{db_path}",
        poolclass=AsyncAdaptedQueuePool,
        pool_size=1,
        max_overflow=0,
        pool_timeout=1,
    )
    try:
        async def hold_connection_for(seconds: float):
            async with engine.connect() as conn:
                await conn.exec_driver_sql("SELECT 1")
                await asyncio.sleep(seconds)

        async def request_extra_connection():
            async with engine.connect():
                pass

        occupier = asyncio.create_task(hold_connection_for(5))
        await asyncio.sleep(0.05)  # deja que occupier tome la unica conexion

        started_at = asyncio.get_event_loop().time()
        with pytest.raises(PoolTimeoutError):
            await request_extra_connection()
        elapsed = asyncio.get_event_loop().time() - started_at

        # No se queda esperando indefinidamente: falla cerca del pool_timeout
        # configurado (1s), con margen generoso para no ser un test flaky.
        assert elapsed < 3
        occupier.cancel()
    finally:
        await engine.dispose()
