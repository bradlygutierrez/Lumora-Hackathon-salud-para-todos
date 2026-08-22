import asyncio

from sqlalchemy import select

from lumora_api.db.session import SessionLocal
from lumora_api.models import EstadoCita, Permiso, Rol, Sexo, TipoCita, TipoSangre

CATALOGS = {
    Permiso: [
        ("usuarios:leer", "Consultar usuarios"),
        ("usuarios:editar", "Modificar usuarios"),
        ("rbac:manage", "Administrar roles y permisos"),
    ],
    EstadoCita: ["Pendiente", "Confirmada", "Cancelada", "Completada"],
    TipoCita: ["Presencial", "Virtual"],
    Sexo: ["Femenino", "Masculino", "Otro", "Prefiero no indicar"],
    TipoSangre: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
}

ROLES = {
    "Administrador": "Acceso administrativo",
    "Paciente": "Acceso base de paciente",
    "Profesional": "Acceso para profesionales de salud",
}


async def seed() -> None:
    async with SessionLocal() as session:
        for model, values in CATALOGS.items():
            existing = set(await session.scalars(select(model.nombre)))
            for value in values:
                name, *description = value if isinstance(value, tuple) else (value,)
                if name not in existing:
                    session.add(model(nombre=name, descripcion=description[0]) if description else model(nombre=name))
        for name, description in ROLES.items():
            if not await session.scalar(select(Rol).where(Rol.nombre == name)):
                session.add(Rol(nombre=name, descripcion=description))
        await session.flush()
        admin = await session.scalar(select(Rol).where(Rol.nombre == "Administrador"))
        admin.permisos = list(await session.scalars(select(Permiso)))
        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
