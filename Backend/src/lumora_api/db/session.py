from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from lumora_api.core.config import Settings, get_settings


def build_engine(settings: Settings) -> AsyncEngine:
    """I06 -- crea el engine con un pool de conexiones explicito.

    Ver Settings.db_pool_size/db_max_overflow/etc (core/config.py) para la
    formula de capacidad y los valores por defecto. pool_pre_ping se
    mantiene: antes de prestar una conexion del pool, valida que siga viva
    (SELECT 1 liviano) y la descarta/reabre si no -- protege contra
    desconexiones transitorias de Neon (autoscaling, restarts, idle).

    Los parametros de tamano de pool (pool_size/max_overflow/pool_timeout)
    solo aplican al driver real de Postgres (asyncpg, QueuePool) -- se
    omiten para sqlite (StaticPool/NullPool, no los acepta) porque sqlite
    solo se usa como DATABASE_URL de los tests (ver tests/conftest.py),
    nunca en produccion.
    """
    kwargs: dict[str, object] = {"pool_pre_ping": True}
    if not settings.database_url.startswith("sqlite"):
        kwargs.update(
            pool_size=settings.db_pool_size,
            max_overflow=settings.db_max_overflow,
            pool_timeout=settings.db_pool_timeout_seconds,
            pool_recycle=settings.db_pool_recycle_seconds,
        )
    return create_async_engine(settings.database_url, **kwargs)


engine = build_engine(get_settings())
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session
