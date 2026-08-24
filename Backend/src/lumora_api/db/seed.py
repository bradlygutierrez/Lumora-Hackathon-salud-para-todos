import asyncio

from sqlalchemy import select

from lumora_api.db.session import SessionLocal
from lumora_api.models import (
    CargoSalud,
    Especialidad,
    EstadoCita,
    EstadoCondicion,
    EstadoDosis,
    EstadoExpediente,
    EstadoReceta,
    MotivoConsulta,
    NivelSeveridad,
    OrigenRegistro,
    Permiso,
    Rol,
    Sexo,
    TipoAlerta,
    TipoAntecedente,
    TipoCita,
    TipoDiagnostico,
    TipoRecordatorio,
    TipoRelacion,
    TipoSangre,
    UnidadMedida,
    ViaAdministracion,
)

CATALOGS = {
    Permiso: [
        ("usuarios:leer", "Consultar usuarios"),
        ("usuarios:editar", "Modificar usuarios"),
        ("rbac:manage", "Administrar roles y permisos"),
        ("clinica:manage", "Gestionar expedientes clínicos"),
    ],
    EstadoCita: ["Pendiente", "Confirmada", "Cancelada", "Completada"],
    TipoCita: ["Presencial", "Virtual"],
    Sexo: ["Femenino", "Masculino", "Otro", "Prefiero no indicar"],
    TipoSangre: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    # Catálogos clínicos
    CargoSalud: ["Médico general", "Especialista", "Enfermería", "Farmacéutico"],
    Especialidad: ["Medicina general", "Cardiología", "Pediatría", "Ginecología"],
    EstadoExpediente: ["Activo", "Inactivo", "Archivado"],
    EstadoCondicion: ["Activa", "Resuelta", "En observación", "Crónica"],
    TipoAntecedente: ["Personal", "Familiar", "Quirúrgico", "Alergológico"],
    TipoDiagnostico: ["Presuntivo", "Confirmado", "Diferencial"],
    MotivoConsulta: ["Control", "Dolor", "Seguimiento", "Emergencia"],
    # Nuevos Catálogos A01
    EstadoDosis: ["Tomada", "Omitida", "Pospuesta", "Pendiente"],
    EstadoReceta: ["Activa", "Completada", "Suspendida", "Vencida"],
    ViaAdministracion: ["Oral", "Intravenosa", "Intramuscular", "Tópica", "Subcutánea", "Inhalatoria", "Oftálmica", "Otorrinolaringológica"],
    UnidadMedida: ["mg", "g", "ml", "UI", "mcg", "Tableta", "Cápsula", "Gota"],
    OrigenRegistro: ["Manual", "Dispositivo", "Profesional"],
    NivelSeveridad: ["Baja", "Media", "Alta", "Crítica"],
    TipoAlerta: ["Interacción", "Dosis Olvidada", "Reabastecimiento", "Efecto Secundario"],
    TipoRecordatorio: ["Medicación", "Cita", "Medición"],
    TipoRelacion: ["Padre/Madre", "Hijo/a", "Cónyuge", "Tutor Legal", "Otro"],
}


ROLES = {
    "Paciente": "Acceso base de paciente",
    "Administrador": "Acceso administrativo",
}


async def seed() -> None:
    async with SessionLocal() as session:
        for model, values in CATALOGS.items():
            existing = set(await session.scalars(select(model.nombre)))
            for value in values:
                name, *description = value if isinstance(value, tuple) else (value,)
                if name not in existing:
                    session.add(model(nombre=name, descripcion=description[0]) if description else model(nombre=name))
        roles = {}
        for name, description in ROLES.items():
            role = await session.scalar(select(Rol).where(Rol.nombre == name))
            if role is None:
                role = Rol(nombre=name, descripcion=description, permisos=[])
                session.add(role)
            roles[name] = role
        await session.flush()
        roles["Administrador"].permisos = list(await session.scalars(select(Permiso)))
        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
