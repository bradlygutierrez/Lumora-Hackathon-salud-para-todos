"""Datos sintéticos e idempotentes para QA manual de J15.

Uso:
    uv run python -m lumora_api.db.seed
    $env:J15_QA_PASSWORD = "UnaClaveQA!2026"
    uv run python -m lumora_api.db.seed_j15_qa

Este módulo solo debe ejecutarse en entornos no productivos.
"""

from __future__ import annotations

import asyncio
import os
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from lumora_api.core.config import get_settings
from lumora_api.core.security import hash_password, validate_password_policy
from lumora_api.db.session import SessionLocal
from lumora_api.models.appointments import Cita, HorarioProfesional, UbicacionAtencion
from lumora_api.models.catalogs import (
    EstadoCita,
    EstadoExpediente,
    MotivoConsulta,
    OrigenRegistro,
    Permiso,
    Rol,
    Sexo,
    TipoCita,
    TipoSangre,
    UnidadMedida,
)
from lumora_api.models.clinical import ConsultaMedica, Expediente, SignoVital
from lumora_api.models.health_indicators import IndicadorMedico, MedicionIndicador
from lumora_api.models.identity import Paciente, Persona, ProfesionalSalud, Usuario


QA_PASSWORD_ENV = "J15_QA_PASSWORD"

PROFESSIONAL_A = {
    "username": "qa_j15_medico_a",
    "email": "qa.j15.medico.a@example.com",
    "nombres": "QA J15",
    "apellidos": "Médico Agenda",
    "especialidad": "Medicina general",
    "licencia": "QA-J15-MED-A",
}
PROFESSIONAL_B = {
    "username": "qa_j15_medico_b",
    "email": "qa.j15.medico.b@example.com",
    "nombres": "QA J15",
    "apellidos": "Médico Aislamiento",
    "especialidad": "Cardiología",
    "licencia": "QA-J15-MED-B",
}
PATIENTS = (
    {
        "username": "qa_j15_paciente_1",
        "email": "qa.j15.paciente.1@example.com",
        "nombres": "Ana QA",
        "apellidos": "Agenda",
        "sexo": "Femenino",
        "sangre": "O+",
    },
    {
        "username": "qa_j15_paciente_2",
        "email": "qa.j15.paciente.2@example.com",
        "nombres": "Bruno QA",
        "apellidos": "Consulta",
        "sexo": "Masculino",
        "sangre": "A+",
    },
    {
        "username": "qa_j15_paciente_3",
        "email": "qa.j15.paciente.3@example.com",
        "nombres": "Carla QA",
        "apellidos": "Aislamiento",
        "sexo": "Femenino",
        "sangre": "B+",
    },
)


async def require_named(session: AsyncSession, model, name: str):
    item = await session.scalar(select(model).where(model.nombre == name))
    if item is None:
        raise RuntimeError(
            f"Falta catálogo requerido {model.__name__}={name!r}. "
            "Ejecute primero: uv run python -m lumora_api.db.seed"
        )
    return item


async def require_indicator(session: AsyncSession, code: str) -> IndicadorMedico:
    item = await session.scalar(
        select(IndicadorMedico).where(IndicadorMedico.codigo == code)
    )
    if item is None:
        raise RuntimeError(
            f"Falta indicador médico {code!r}. "
            "Ejecute primero: uv run python -m lumora_api.db.seed"
        )
    return item


async def ensure_professional_role(session: AsyncSession) -> Rol:
    permission = await require_named(session, Permiso, "clinica:manage")
    role = await session.scalar(select(Rol).where(Rol.nombre == "Profesional"))
    if role is None:
        role = Rol(
            nombre="Profesional",
            descripcion="Profesional de salud con acceso clínico",
            permisos=[permission],
        )
        session.add(role)
        await session.flush()
    elif all(item.id != permission.id for item in role.permisos):
        role.permisos.append(permission)
        await session.flush()
    return role


async def ensure_professional(
    session: AsyncSession,
    spec: dict[str, str],
    role: Rol,
    password: str,
) -> tuple[Usuario, ProfesionalSalud]:
    user = await session.scalar(
        select(Usuario).where(Usuario.username == spec["username"])
    )

    if user is None:
        persona = Persona(
            nombres=spec["nombres"],
            apellidos=spec["apellidos"],
            email=spec["email"],
        )
        user = Usuario(
            persona=persona,
            email=spec["email"],
            username=spec["username"],
            password_hash=hash_password(password),
            activo=True,
            email_verificado=True,
            roles=[role],
        )
        professional = ProfesionalSalud(
            persona=persona,
            especialidad=spec["especialidad"],
            numero_licencia=spec["licencia"],
        )
        session.add_all([user, professional])
        await session.flush()
        return user, professional

    user.persona.nombres = spec["nombres"]
    user.persona.apellidos = spec["apellidos"]
    user.persona.email = spec["email"]
    user.email = spec["email"]
    user.activo = True
    user.email_verificado = True
    user.password_hash = hash_password(password)
    if all(item.id != role.id for item in user.roles):
        user.roles.append(role)

    professional = await session.scalar(
        select(ProfesionalSalud).where(
            ProfesionalSalud.persona_id == user.persona_id
        )
    )
    if professional is None:
        professional = ProfesionalSalud(
            persona_id=user.persona_id,
            especialidad=spec["especialidad"],
            numero_licencia=spec["licencia"],
        )
        session.add(professional)
    else:
        professional.especialidad = spec["especialidad"]
        professional.numero_licencia = spec["licencia"]
        professional.deleted_at = None

    await session.flush()
    return user, professional


async def ensure_patient(
    session: AsyncSession,
    spec: dict[str, str],
    role: Rol,
    password: str,
    sex: Sexo,
    blood_type: TipoSangre,
) -> tuple[Usuario, Paciente]:
    user = await session.scalar(
        select(Usuario).where(Usuario.username == spec["username"])
    )

    if user is None:
        persona = Persona(
            nombres=spec["nombres"],
            apellidos=spec["apellidos"],
            email=spec["email"],
            sexo_id=sex.id,
        )
        user = Usuario(
            persona=persona,
            email=spec["email"],
            username=spec["username"],
            password_hash=hash_password(password),
            activo=True,
            email_verificado=True,
            roles=[role],
        )
        patient = Paciente(
            persona=persona,
            tipo_sangre_id=blood_type.id,
        )
        session.add_all([user, patient])
        await session.flush()
        return user, patient

    user.persona.nombres = spec["nombres"]
    user.persona.apellidos = spec["apellidos"]
    user.persona.email = spec["email"]
    user.persona.sexo_id = sex.id
    user.email = spec["email"]
    user.activo = True
    user.email_verificado = True
    user.password_hash = hash_password(password)
    if all(item.id != role.id for item in user.roles):
        user.roles.append(role)

    patient = await session.scalar(
        select(Paciente).where(Paciente.persona_id == user.persona_id)
    )
    if patient is None:
        patient = Paciente(
            persona_id=user.persona_id,
            tipo_sangre_id=blood_type.id,
        )
        session.add(patient)
    else:
        patient.tipo_sangre_id = blood_type.id
        patient.deleted_at = None

    await session.flush()
    return user, patient


async def ensure_location(session: AsyncSession) -> UbicacionAtencion:
    location = await session.scalar(
        select(UbicacionAtencion).where(
            UbicacionAtencion.nombre == "Clínica Lumora"
        )
    )
    if location is None:
        location = UbicacionAtencion(
            nombre="Clínica Lumora",
            direccion="Managua, Nicaragua",
            consultorio="Consultorio QA J15",
            activo=True,
        )
        session.add(location)
    else:
        location.direccion = "Managua, Nicaragua"
        location.consultorio = "Consultorio QA J15"
        location.activo = True
    await session.flush()
    return location


def next_weekday(target_weekday: int) -> date:
    today = datetime.now(timezone.utc).date()
    delta = (target_weekday - today.weekday()) % 7
    if delta == 0:
        delta = 7
    return today + timedelta(days=delta)


async def reset_qa_schedules(
    session: AsyncSession,
    professional_a: ProfesionalSalud,
    professional_b: ProfesionalSalud,
) -> None:
    await session.execute(
        delete(HorarioProfesional).where(
            HorarioProfesional.profesional_id.in_(
                [professional_a.id, professional_b.id]
            )
        )
    )
    session.add_all(
        [
            HorarioProfesional(
                profesional_id=professional_a.id,
                dia_semana=0,
                hora_inicio=time(8, 0),
                hora_fin=time(12, 0),
                activo=True,
            ),
            HorarioProfesional(
                profesional_id=professional_a.id,
                dia_semana=1,
                hora_inicio=time(13, 0),
                hora_fin=time(17, 0),
                activo=True,
            ),
            HorarioProfesional(
                profesional_id=professional_b.id,
                dia_semana=0,
                hora_inicio=time(8, 0),
                hora_fin=time(12, 0),
                activo=True,
            ),
        ]
    )
    await session.flush()


async def upsert_appointment(
    session: AsyncSession,
    *,
    marker: str,
    patient: Paciente,
    professional: ProfesionalSalud,
    appointment_type: TipoCita,
    status: EstadoCita,
    location: UbicacionAtencion,
    start: datetime,
    end: datetime,
) -> Cita:
    item = await session.scalar(select(Cita).where(Cita.notas == marker))
    values = {
        "paciente_id": patient.id,
        "profesional_id": professional.id,
        "tipo_cita_id": appointment_type.id,
        "estado_cita_id": status.id,
        "ubicacion_id": location.id,
        "inicio": start,
        "fin": end,
        "notas": marker,
    }
    if item is None:
        item = Cita(**values)
        session.add(item)
    else:
        for key, value in values.items():
            setattr(item, key, value)
    await session.flush()
    return item


async def ensure_record(
    session: AsyncSession,
    *,
    patient: Paciente,
    number: str,
    status: EstadoExpediente,
) -> Expediente:
    record = await session.scalar(
        select(Expediente).where(Expediente.numero_expediente == number)
    )
    if record is None:
        record = Expediente(
            paciente_id=patient.id,
            estado_expediente_id=status.id,
            numero_expediente=number,
            notas="Expediente sintético QA J15",
            activo=True,
        )
        session.add(record)
    else:
        record.paciente_id = patient.id
        record.estado_expediente_id = status.id
        record.notas = "Expediente sintético QA J15"
        record.activo = True
        record.deleted_at = None
    await session.flush()
    return record


async def ensure_consultation_and_vitals(
    session: AsyncSession,
    *,
    patient: Paciente,
    professional: ProfesionalSalud,
    record: Expediente,
    reason: MotivoConsulta,
) -> ConsultaMedica:
    marker = "QA_J15_CONSULTA_P2"
    consultation = await session.scalar(
        select(ConsultaMedica).where(ConsultaMedica.observaciones == marker)
    )
    consultation_date = datetime.now(timezone.utc) - timedelta(days=2)

    if consultation is None:
        consultation = ConsultaMedica(
            expediente_id=record.id,
            paciente_id=patient.id,
            profesional_id=professional.id,
            motivo_consulta_id=reason.id,
            fecha_consulta=consultation_date,
            motivo="Control general QA J15",
            sintomas="Sin síntomas de alarma. Datos sintéticos.",
            evaluacion="Paciente estable para prueba funcional.",
            indicaciones="Continuar seguimiento. Datos sintéticos QA.",
            observaciones=marker,
            activo=True,
        )
        session.add(consultation)
        await session.flush()
    else:
        consultation.expediente_id = record.id
        consultation.paciente_id = patient.id
        consultation.profesional_id = professional.id
        consultation.motivo_consulta_id = reason.id
        consultation.fecha_consulta = consultation_date
        consultation.activo = True
        consultation.deleted_at = None

    vitals = await session.scalar(
        select(SignoVital)
        .where(SignoVital.consulta_id == consultation.id)
        .order_by(SignoVital.id)
    )
    if vitals is None:
        vitals = SignoVital(consulta_id=consultation.id)
        session.add(vitals)

    vitals.temperatura_c = 36.7
    vitals.frecuencia_cardiaca = 72
    vitals.frecuencia_respiratoria = 16
    vitals.presion_sistolica = 118
    vitals.presion_diastolica = 76
    vitals.saturacion_oxigeno = 98
    vitals.peso_kg = 74.2
    vitals.talla_cm = 176.0
    vitals.glucosa_mg_dl = 94
    vitals.registrado_at = consultation_date
    await session.flush()
    return consultation


async def upsert_measurement(
    session: AsyncSession,
    *,
    marker: str,
    patient: Paciente,
    indicator: IndicadorMedico,
    value: float,
    unit: UnidadMedida,
    origin: OrigenRegistro,
    registered_by: Usuario,
    measured_at: datetime,
) -> None:
    item = await session.scalar(
        select(MedicionIndicador).where(MedicionIndicador.observaciones == marker)
    )
    values = {
        "paciente_id": patient.id,
        "indicador_id": indicator.id,
        "valor": value,
        "unidad_medida_id": unit.id,
        "origen_registro_id": origin.id,
        "registrado_por_id": registered_by.id,
        "fecha_medicion": measured_at.replace(tzinfo=None),
        "observaciones": marker,
    }
    if item is None:
        session.add(MedicionIndicador(**values))
    else:
        for key, value in values.items():
            setattr(item, key, value)


async def seed_j15_qa() -> None:
    settings = get_settings()
    if settings.environment == "production":
        raise RuntimeError("El seed QA J15 está bloqueado en ENVIRONMENT=production")

    password = os.getenv(QA_PASSWORD_ENV)
    if not password:
        raise RuntimeError(
            f"Defina {QA_PASSWORD_ENV} antes de ejecutar el seed. "
            "No guarde esa clave en el repositorio."
        )
    validate_password_policy(password)

    async with SessionLocal() as session:
        professional_role = await ensure_professional_role(session)
        patient_role = await require_named(session, Rol, "Paciente")

        professional_a_user, professional_a = await ensure_professional(
            session, PROFESSIONAL_A, professional_role, password
        )
        professional_b_user, professional_b = await ensure_professional(
            session, PROFESSIONAL_B, professional_role, password
        )

        patients: list[tuple[Usuario, Paciente]] = []
        for spec in PATIENTS:
            sex = await require_named(session, Sexo, spec["sexo"])
            blood_type = await require_named(session, TipoSangre, spec["sangre"])
            patients.append(
                await ensure_patient(
                    session,
                    spec,
                    patient_role,
                    password,
                    sex,
                    blood_type,
                )
            )

        patient_1_user, patient_1 = patients[0]
        patient_2_user, patient_2 = patients[1]
        _patient_3_user, patient_3 = patients[2]

        location = await ensure_location(session)
        await reset_qa_schedules(session, professional_a, professional_b)

        confirmed = await require_named(session, EstadoCita, "Confirmada")
        cancelled = await require_named(session, EstadoCita, "Cancelada")
        presencial = await require_named(session, TipoCita, "Presencial")

        monday = next_weekday(0)
        monday_start = datetime.combine(monday, time(8, 0), tzinfo=timezone.utc)

        # Profesional A:
        # 08:00–08:45 libre
        # 08:45–09:30 ocupada
        # 09:30–10:15 cancelada => debe seguir disponible
        await upsert_appointment(
            session,
            marker="QA_J15_A_CONFIRMADA_P1",
            patient=patient_1,
            professional=professional_a,
            appointment_type=presencial,
            status=confirmed,
            location=location,
            start=monday_start + timedelta(minutes=45),
            end=monday_start + timedelta(minutes=90),
        )
        await upsert_appointment(
            session,
            marker="QA_J15_A_CANCELADA_P1",
            patient=patient_1,
            professional=professional_a,
            appointment_type=presencial,
            status=cancelled,
            location=location,
            start=monday_start + timedelta(minutes=90),
            end=monday_start + timedelta(minutes=135),
        )

        # Profesional B ve a Carla en "Mis pacientes"; Profesional A no debe verla ahí.
        await upsert_appointment(
            session,
            marker="QA_J15_B_CONFIRMADA_P3",
            patient=patient_3,
            professional=professional_b,
            appointment_type=presencial,
            status=confirmed,
            location=location,
            start=monday_start,
            end=monday_start + timedelta(minutes=45),
        )

        record_status = await require_named(session, EstadoExpediente, "Activo")
        reason = await require_named(session, MotivoConsulta, "Control")
        await ensure_record(
            session,
            patient=patient_1,
            number="QA-J15-EXP-P1",
            status=record_status,
        )
        patient_2_record = await ensure_record(
            session,
            patient=patient_2,
            number="QA-J15-EXP-P2",
            status=record_status,
        )
        await ensure_consultation_and_vitals(
            session,
            patient=patient_2,
            professional=professional_a,
            record=patient_2_record,
            reason=reason,
        )

        manual_origin = await require_named(session, OrigenRegistro, "Manual")
        units = {
            "mmHg": await require_named(session, UnidadMedida, "mmHg"),
            "mg/dL": await require_named(session, UnidadMedida, "mg/dL"),
            "kg": await require_named(session, UnidadMedida, "kg"),
            "%": await require_named(session, UnidadMedida, "%"),
            "°C": await require_named(session, UnidadMedida, "°C"),
        }
        indicators = {
            "presion_arterial_sistolica": await require_indicator(
                session, "presion_arterial_sistolica"
            ),
            "glucosa": await require_indicator(session, "glucosa"),
            "peso": await require_indicator(session, "peso"),
            "saturacion_oxigeno": await require_indicator(
                session, "saturacion_oxigeno"
            ),
            "temperatura_corporal": await require_indicator(
                session, "temperatura_corporal"
            ),
        }

        now = datetime.now(timezone.utc)
        measurements = (
            ("presion_arterial_sistolica", 116.0, "mmHg", 3),
            ("presion_arterial_sistolica", 119.0, "mmHg", 1),
            ("glucosa", 91.0, "mg/dL", 4),
            ("glucosa", 96.0, "mg/dL", 1),
            ("peso", 74.8, "kg", 7),
            ("peso", 74.2, "kg", 1),
            ("saturacion_oxigeno", 97.0, "%", 2),
            ("saturacion_oxigeno", 98.0, "%", 1),
            ("temperatura_corporal", 36.5, "°C", 2),
            ("temperatura_corporal", 36.7, "°C", 1),
        )
        for index, (code, value, unit_name, days_ago) in enumerate(
            measurements, start=1
        ):
            await upsert_measurement(
                session,
                marker=f"QA_J15_MED_{index:02d}_{code}",
                patient=patient_2,
                indicator=indicators[code],
                value=value,
                unit=units[unit_name],
                origin=manual_origin,
                registered_by=patient_2_user,
                measured_at=now - timedelta(days=days_ago),
            )

        await session.commit()

        print("QA J15 listo.")
        print("")
        print("Profesional A:")
        print(f"  usuario: {professional_a_user.username}")
        print(f"  email:   {professional_a_user.email}")
        print("  Mis pacientes esperados: Ana QA Agenda + Bruno QA Consulta")
        print("")
        print("Profesional B:")
        print(f"  usuario: {professional_b_user.username}")
        print(f"  email:   {professional_b_user.email}")
        print("  Mis pacientes esperados: Carla QA Aislamiento")
        print("")
        print(f"Contraseña: valor de {QA_PASSWORD_ENV} (no se imprime).")
        print(f"Fecha de agenda/disponibilidad QA: {monday.isoformat()}")
        print("")
        print("Disponibilidad esperada del Profesional A para esa fecha:")
        print("  08:00–08:45 disponible")
        print("  08:45–09:30 ocupada por cita confirmada")
        print("  09:30–10:15 disponible porque la cita está cancelada")
        print("")
        print("Bruno QA Consulta contiene signos vitales y mediciones históricas.")


if __name__ == "__main__":
    asyncio.run(seed_j15_qa())
