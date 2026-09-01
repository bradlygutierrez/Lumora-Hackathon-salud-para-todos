import asyncio
from datetime import time

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
    ProfesionalSalud, HorarioProfesional, UbicacionAtencion,
)
from lumora_api.models.health_indicators import IndicadorMedico, RangoIndicador

CATALOGS = {
    Permiso: [
        ("usuarios:leer", "Consultar usuarios"),
        ("usuarios:editar", "Modificar usuarios"),
        ("rbac:manage", "Administrar roles y permisos"),
        ("clinica:manage", "Gestionar expedientes clÃ­nicos"),
        ("afiliaciones:manage", "Administrar afiliaciones médicas"),
    ],
    EstadoCita: ["Pendiente", "Confirmada", "Cancelada", "Completada"],
    TipoCita: ["Presencial", "Virtual"],
    Sexo: ["Femenino", "Masculino", "Otro", "Prefiero no indicar"],
    TipoSangre: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    # CatÃ¡logos clÃ­nicos
    CargoSalud: ["MÃ©dico general", "Especialista", "EnfermerÃ­a", "FarmacÃ©utico"],
    Especialidad: ["Medicina general", "CardiologÃ­a", "PediatrÃ­a", "GinecologÃ­a"],
    EstadoExpediente: ["Activo", "Inactivo", "Archivado"],
    EstadoCondicion: ["Activa", "Resuelta", "En observaciÃ³n", "CrÃ³nica"],
    TipoAntecedente: ["Personal", "Familiar", "QuirÃºrgico", "AlergolÃ³gico"],
    TipoDiagnostico: ["Presuntivo", "Confirmado", "Diferencial"],
    MotivoConsulta: ["Control", "Dolor", "Seguimiento", "Emergencia"],
    # Nuevos CatÃ¡logos A01
    EstadoDosis: ["Tomada", "Omitida", "Pospuesta", "Pendiente"],
    EstadoReceta: ["Activa", "Completada", "Suspendida", "Vencida"],
    ViaAdministracion: ["Oral", "Intravenosa", "Intramuscular", "TÃ³pica", "SubcutÃ¡nea", "Inhalatoria", "OftÃ¡lmica", "OtorrinolaringolÃ³gica"],
    UnidadMedida: ["mg", "g", "ml", "UI", "mcg", "Tableta", "CÃ¡psula", "Gota", "mmHg", "mg/dL", "kg", "%", "Â°C"],
    OrigenRegistro: ["Manual", "Dispositivo", "Profesional"],
    NivelSeveridad: ["Baja", "Media", "Alta", "CrÃ­tica"],
    TipoAlerta: ["InteracciÃ³n", "Dosis Olvidada", "Reabastecimiento", "Efecto Secundario", "MediciÃ³n Fuera de Rango"],
    TipoRecordatorio: ["MedicaciÃ³n", "Cita", "MediciÃ³n", "Seguimiento"],
    TipoRelacion: ["Padre/Madre", "Hijo/a", "CÃ³nyuge", "Tutor Legal", "Otro"],
}


ROLES = {
    "Paciente": "Acceso base de paciente",
    "Cuidador": "Acceso base de cuidador",
    "Administrador": "Acceso administrativo",
    "Profesional de Salud": "Acceso clínico sujeto a afiliación vigente",
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
        "PresiÃ³n arterial (sistÃ³lica)",
        "mmHg",
        "PresiÃ³n arterial sistÃ³lica en reposo.",
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
        "SaturaciÃ³n de oxÃ­geno",
        "%",
        "SaturaciÃ³n de oxÃ­geno en sangre (SpO2).",
        ("Alta", 95.0, 100.0, "Fuera de rango"),
    ),
    (
        "temperatura_corporal",
        "Temperatura corporal",
        "Â°C",
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
        clinical_permission = await session.scalar(select(Permiso).where(Permiso.nombre == "clinica:manage"))
        roles["Profesional de Salud"].permisos = [clinical_permission] if clinical_permission else []
        await session.flush()
        await seed_health_indicators(session)
        professionals = list(await session.scalars(select(ProfesionalSalud).where(ProfesionalSalud.deleted_at.is_(None))))
        location = await session.scalar(select(UbicacionAtencion).where(UbicacionAtencion.nombre == "ClÃ­nica Lumora"))
        if professionals and location is None:
            location = UbicacionAtencion(nombre="ClÃ­nica Lumora", direccion="Managua, Nicaragua", consultorio="Consultorio 1")
            session.add(location)
            await session.flush()
        if professionals:
            for professional in professionals:
                exists = await session.scalar(select(HorarioProfesional.id).where(HorarioProfesional.profesional_id == professional.id))
                if exists is None:
                    session.add(HorarioProfesional(profesional_id=professional.id, dia_semana=0, hora_inicio=time(8), hora_fin=time(17)))
                    session.add(HorarioProfesional(profesional_id=professional.id, dia_semana=1, hora_inicio=time(8), hora_fin=time(17)))
                    session.add(HorarioProfesional(profesional_id=professional.id, dia_semana=2, hora_inicio=time(8), hora_fin=time(17)))
                    session.add(HorarioProfesional(profesional_id=professional.id, dia_semana=3, hora_inicio=time(8), hora_fin=time(17)))
                    session.add(HorarioProfesional(profesional_id=professional.id, dia_semana=4, hora_inicio=time(8), hora_fin=time(17)))
        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())