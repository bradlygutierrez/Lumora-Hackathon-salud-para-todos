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
from lumora_api.models.health_indicators import IndicadorMedico, RangoIndicador

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
    UnidadMedida: ["mg", "g", "ml", "UI", "mcg", "Tableta", "Cápsula", "Gota", "mmHg", "mg/dL", "kg", "%", "°C"],
    OrigenRegistro: ["Manual", "Dispositivo", "Profesional"],
    NivelSeveridad: ["Baja", "Media", "Alta", "Crítica"],
    TipoAlerta: ["Interacción", "Dosis Olvidada", "Reabastecimiento", "Efecto Secundario", "Medición Fuera de Rango"],
    TipoRecordatorio: ["Medicación", "Cita", "Medición"],
    TipoRelacion: ["Padre/Madre", "Hijo/a", "Cónyuge", "Tutor Legal", "Otro"],
}


ROLES = {
    "Paciente": "Acceso base de paciente",
    "Administrador": "Acceso administrativo",
}


# Indicadores base para A08 (Indicadores + nueva medicion + historial).
# Cada entrada: (codigo, nombre, unidad, descripcion, rango o None).
# El rango representa la banda saludable: fuera de ese min/max se genera
# una alerta con la etiqueta y severidad indicadas (ver
# HealthIndicatorsService.registrar_medicion). "Peso" no lleva rango por
# defecto porque no existe un valor "normal" universal por persona.
HEALTH_INDICATORS = [
    (
        "presion_arterial_sistolica",
        "Presión arterial (sistólica)",
        "mmHg",
        "Presión arterial sistólica en reposo.",
        ("Media", 90.0, 120.0, "Fuera de rango"),
    ),
    (
        "glucosa",
        "Glucosa",
        "mg/dL",
        "Nivel de glucosa en sangre.",
        ("Media", 70.0, 100.0, "Fuera de rango"),
    ),
    (
        "peso",
        "Peso",
        "kg",
        "Peso corporal.",
        None,
    ),
    (
        "saturacion_oxigeno",
        "Saturación de oxígeno",
        "%",
        "Saturación de oxígeno en sangre (SpO2).",
        ("Alta", 95.0, 100.0, "Fuera de rango"),
    ),
    (
        "temperatura_corporal",
        "Temperatura corporal",
        "°C",
        "Temperatura corporal.",
        ("Media", 36.1, 37.2, "Fuera de rango"),
    ),
]


async def seed_health_indicators(session) -> None:
    unidades = {
        row.nombre: row.id
        for row in await session.scalars(select(UnidadMedida))
    }
    niveles = {
        row.nombre: row.id
        for row in await session.scalars(select(NivelSeveridad))
    }
    existentes = {
        row.codigo: row
        for row in await session.scalars(select(IndicadorMedico))
    }

    for codigo, nombre, unidad_nombre, descripcion, rango in HEALTH_INDICATORS:
        indicador = existentes.get(codigo)
        if indicador is None:
            indicador = IndicadorMedico(
                codigo=codigo,
                nombre=nombre,
                unidad_medida_id=unidades[unidad_nombre],
                descripcion=descripcion,
            )
            session.add(indicador)
            await session.flush()
            existentes[codigo] = indicador

        if rango is None:
            continue

        nivel_nombre, valor_minimo, valor_maximo, etiqueta = rango
        tiene_rango = await session.scalar(
            select(RangoIndicador).where(RangoIndicador.indicador_id == indicador.id)
        )
        if tiene_rango is None:
            session.add(
                RangoIndicador(
                    indicador_id=indicador.id,
                    nivel_severidad_id=niveles[nivel_nombre],
                    valor_minimo=valor_minimo,
                    valor_maximo=valor_maximo,
                    etiqueta=etiqueta,
                )
            )


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
        await session.flush()
        await seed_health_indicators(session)
        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
