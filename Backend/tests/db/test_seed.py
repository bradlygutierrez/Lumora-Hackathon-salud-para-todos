import pytest
from sqlalchemy import func, select

from lumora_api.db import seed as seed_module
from lumora_api.models import EstadoCita, Permiso, Rol, Sexo, TipoCita, TipoSangre


@pytest.mark.asyncio
async def test_seed_loads_all_catalogs_and_is_idempotent(session_factory, monkeypatch):
    monkeypatch.setattr(seed_module, "SessionLocal", session_factory)
    await seed_module.seed()
    await seed_module.seed()

    async with session_factory() as session:
        assert await session.scalar(select(func.count()).select_from(Rol)) == 2
        assert await session.scalar(select(func.count()).select_from(Permiso)) == 4
        assert await session.scalar(select(func.count()).select_from(EstadoCita)) == 4
        assert await session.scalar(select(func.count()).select_from(TipoCita)) == 2
        assert await session.scalar(select(func.count()).select_from(Sexo)) == 4
        assert await session.scalar(select(func.count()).select_from(TipoSangre)) == 8
        admin = await session.scalar(select(Rol).where(Rol.nombre == "Administrador"))
        assert {permission.nombre for permission in admin.permisos} == {
            "usuarios:leer",
            "usuarios:editar",
            "rbac:manage",
            "clinica:manage",
        }
