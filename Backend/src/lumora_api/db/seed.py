import asyncio

from sqlalchemy import select

from lumora_api.db.session import SessionLocal
from lumora_api.models import EstadoCita, Permiso, Rol, Sexo, TipoCita, TipoSangre

CATALOGS = {
    Permiso: [("usuarios:leer", "Consultar usuarios"), ("usuarios:editar", "Modificar usuarios")],
    EstadoCita: ["Pendiente", "Confirmada", "Cancelada", "Completada"],
    TipoCita: ["Presencial", "Virtual"],
    Sexo: ["Femenino", "Masculino", "Otro", "Prefiero no indicar"],
    TipoSangre: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
}


async def seed() -> None:
    async with SessionLocal() as session:
        for model, values in CATALOGS.items():
            existing = set(await session.scalars(select(model.nombre)))
            for value in values:
                name, *description = value if isinstance(value, tuple) else (value,)
                if name not in existing:
                    session.add(model(nombre=name, descripcion=description[0]) if description else model(nombre=name))
        if not await session.scalar(select(Rol).where(Rol.nombre == "Administrador")):
            session.add(Rol(nombre="Administrador", descripcion="Acceso administrativo"))
        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
