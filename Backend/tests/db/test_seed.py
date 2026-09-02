import pytest
from sqlalchemy import func, select

from lumora_api.db import seed as seed_module
from lumora_api.models import CargoSalud, EstadoCita, Especialidad, Permiso, Rol, Sexo, TipoCita, TipoSangre, UnidadMedida


@pytest.mark.asyncio
async def test_seed_loads_all_catalogs_and_is_idempotent(session_factory, monkeypatch):
    monkeypatch.setattr(seed_module, "SessionLocal", session_factory)
    await seed_module.seed()
    await seed_module.seed()

    async with session_factory() as session:
        assert await session.scalar(select(func.count()).select_from(Rol)) == 4
        assert await session.scalar(select(func.count()).select_from(Permiso)) == 5
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
            "afiliaciones:manage",
        }
        assert await session.scalar(select(Especialidad).where(Especialidad.nombre == "Cardiolog\u00eda")) is not None
        assert await session.scalar(select(CargoSalud).where(CargoSalud.nombre == "M\u00e9dico general")) is not None
        assert await session.scalar(select(UnidadMedida).where(UnidadMedida.nombre == "\u00b0C")) is not None
        assert await session.scalar(select(Especialidad).where(Especialidad.nombre == "Cardiolog" + chr(195) + chr(173) + "a")) is None
        assert await session.scalar(select(CargoSalud).where(CargoSalud.nombre == "M\u00c3\u00a9dico general")) is None
        assert await session.scalar(select(UnidadMedida).where(UnidadMedida.nombre == "\u00c2\u00b0C")) is None
        caregiver = await session.scalar(select(Rol).where(Rol.nombre == "Cuidador"))
        assert caregiver is not None
        assert caregiver.permisos == []