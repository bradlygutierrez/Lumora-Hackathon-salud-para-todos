from datetime import datetime, time, timedelta, timezone

import pytest

from lumora_api.core.security import create_access_token, hash_password
from lumora_api.models import (
    Cita,
    ConsultaMedica,
    EstadoCita,
    EstadoExpediente,
    Expediente,
    HorarioProfesional,
    Paciente,
    Permiso,
    Persona,
    ProfesionalSalud,
    Rol,
    Usuario,
)


def headers(user_id: int) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user_id)}"}


async def seed(session_factory):
    async with session_factory() as session:
        clinical_role = Rol(
            nombre="Profesional",
            permisos=[Permiso(nombre="clinica:manage")],
        )
        patient_role = Rol(nombre="Paciente")

        own_person = Persona(nombres="Elena", apellidos="Médica")
        own_user = Usuario(
            persona=own_person,
            email="elena@example.com",
            username="elena",
            password_hash=hash_password("safe-password"),
            roles=[clinical_role],
        )
        own_professional = ProfesionalSalud(
            persona=own_person,
            especialidad="Medicina general",
            numero_licencia="J15-OWN",
        )

        other_person = Persona(nombres="Mario", apellidos="Médico")
        other_user = Usuario(
            persona=other_person,
            email="mario@example.com",
            username="mario",
            password_hash=hash_password("safe-password"),
            roles=[clinical_role],
        )
        other_professional = ProfesionalSalud(
            persona=other_person,
            especialidad="Cardiología",
            numero_licencia="J15-OTHER",
        )

        no_profile = Usuario(
            persona=Persona(nombres="Sin", apellidos="Perfil"),
            email="sin-perfil@example.com",
            username="sin-perfil",
            password_hash=hash_password("safe-password"),
            roles=[clinical_role],
        )
        patient_user = Usuario(
            persona=Persona(nombres="Paula", apellidos="Paciente"),
            email="patient@example.com",
            username="patient",
            password_hash=hash_password("safe-password"),
            roles=[patient_role],
        )

        patient_a = Paciente(persona=Persona(nombres="Ana", apellidos="Agenda"))
        patient_b = Paciente(persona=Persona(nombres="Bruno", apellidos="Consulta"))
        pending = EstadoCita(nombre="Pendiente")
        record_status = EstadoExpediente(nombre="Activo")

        session.add_all(
            [
                own_user,
                own_professional,
                other_user,
                other_professional,
                no_profile,
                patient_user,
                patient_a,
                patient_b,
                pending,
                record_status,
            ]
        )
        await session.flush()

        foreign_schedule = HorarioProfesional(
            profesional_id=other_professional.id,
            dia_semana=0,
            hora_inicio=time(7, 0),
            hora_fin=time(8, 0),
            activo=True,
        )
        record = Expediente(
            paciente_id=patient_b.id,
            estado_expediente_id=record_status.id,
            numero_expediente="J15-REC-1",
            activo=True,
        )
        session.add_all([foreign_schedule, record])
        await session.flush()

        start = datetime.now(timezone.utc) + timedelta(days=2)
        own_appointment = Cita(
            paciente_id=patient_a.id,
            profesional_id=own_professional.id,
            estado_cita_id=pending.id,
            inicio=start,
            fin=start + timedelta(hours=1),
            notas="Control",
        )
        other_appointment = Cita(
            paciente_id=patient_b.id,
            profesional_id=other_professional.id,
            estado_cita_id=pending.id,
            inicio=start,
            fin=start + timedelta(hours=1),
        )
        consultation = ConsultaMedica(
            expediente_id=record.id,
            paciente_id=patient_b.id,
            profesional_id=own_professional.id,
            fecha_consulta=start - timedelta(days=10),
            motivo="Seguimiento",
            activo=True,
        )
        session.add_all([own_appointment, other_appointment, consultation])
        await session.flush()
        result = {
            "own_user": own_user.id,
            "own_professional": own_professional.id,
            "other_user": other_user.id,
            "other_professional": other_professional.id,
            "foreign_schedule": foreign_schedule.id,
            "no_profile": no_profile.id,
            "patient_user": patient_user.id,
            "patient_a": patient_a.id,
            "patient_b": patient_b.id,
            "own_appointment": own_appointment.id,
            "other_appointment": other_appointment.id,
            "consultation": consultation.id,
        }
        await session.commit()
        return result


@pytest.mark.asyncio
async def test_schedule_crud_is_strictly_self_scoped(client, session_factory):
    ctx = await seed(session_factory)
    auth = headers(ctx["own_user"])

    created = await client.post(
        "/api/v1/profesional/me/horarios",
        json={
            "dia_semana": 0,
            "hora_inicio": "08:00:00",
            "hora_fin": "10:00:00",
            "activo": True,
        },
        headers=auth,
    )
    assert created.status_code == 201
    assert created.json()["profesional_id"] == ctx["own_professional"]

    listed = await client.get("/api/v1/profesional/me/horarios", headers=auth)
    assert [item["id"] for item in listed.json()] == [created.json()["id"]]

    overlap = await client.post(
        "/api/v1/profesional/me/horarios",
        json={
            "dia_semana": 0,
            "hora_inicio": "09:00:00",
            "hora_fin": "11:00:00",
        },
        headers=auth,
    )
    assert overlap.status_code == 409

    invalid = await client.post(
        "/api/v1/profesional/me/horarios",
        json={
            "dia_semana": 1,
            "hora_inicio": "11:00:00",
            "hora_fin": "10:00:00",
        },
        headers=auth,
    )
    assert invalid.status_code == 422

    foreign = await client.patch(
        f"/api/v1/profesional/me/horarios/{ctx['foreign_schedule']}",
        json={"activo": False},
        headers=auth,
    )
    assert foreign.status_code == 404

    disabled = await client.patch(
        f"/api/v1/profesional/me/horarios/{created.json()['id']}",
        json={"activo": False},
        headers=auth,
    )
    assert disabled.status_code == 200
    assert disabled.json()["activo"] is False

    deleted = await client.delete(
        f"/api/v1/profesional/me/horarios/{created.json()['id']}",
        headers=auth,
    )
    assert deleted.status_code == 204


@pytest.mark.asyncio
async def test_availability_reuses_real_schedule(client, session_factory):
    ctx = await seed(session_factory)
    auth = headers(ctx["own_user"])

    created = await client.post(
        "/api/v1/profesional/me/horarios",
        json={
            "dia_semana": 0,
            "hora_inicio": "08:00:00",
            "hora_fin": "09:30:00",
        },
        headers=auth,
    )
    assert created.status_code == 201

    available = await client.get(
        "/api/v1/profesional/me/disponibilidad?fecha=2026-08-31",
        headers=auth,
    )
    assert available.status_code == 200
    assert len(available.json()["slots"]) == 2
    assert all(item["disponible"] for item in available.json()["slots"])

    disabled = await client.patch(
        f"/api/v1/profesional/me/horarios/{created.json()['id']}",
        json={"activo": False},
        headers=auth,
    )
    assert disabled.status_code == 200
    empty = await client.get(
        "/api/v1/profesional/me/disponibilidad?fecha=2026-08-31",
        headers=auth,
    )
    assert empty.json()["slots"] == []


@pytest.mark.asyncio
async def test_agenda_and_my_patients_derive_current_professional_context(
    client, session_factory
):
    ctx = await seed(session_factory)
    auth = headers(ctx["own_user"])

    agenda = await client.get("/api/v1/profesional/me/agenda", headers=auth)
    assert agenda.status_code == 200
    assert [item["id"] for item in agenda.json()] == [ctx["own_appointment"]]
    assert agenda.json()[0]["paciente_nombre"] == "Ana Agenda"

    patients = await client.get(
        "/api/v1/profesional/me/pacientes", headers=auth
    )
    assert patients.status_code == 200
    by_id = {item["paciente"]["id"]: item for item in patients.json()}
    assert set(by_id) == {ctx["patient_a"], ctx["patient_b"]}
    assert by_id[ctx["patient_a"]]["proxima_cita"]["id"] == ctx["own_appointment"]
    assert by_id[ctx["patient_b"]]["ultima_consulta"]["id"] == ctx["consultation"]


@pytest.mark.asyncio
async def test_workspace_requires_permission_and_professional_profile(
    client, session_factory
):
    ctx = await seed(session_factory)

    forbidden = await client.get(
        "/api/v1/profesional/me/agenda",
        headers=headers(ctx["patient_user"]),
    )
    no_profile = await client.get(
        "/api/v1/profesional/me/agenda",
        headers=headers(ctx["no_profile"]),
    )

    assert forbidden.status_code == 403
    assert no_profile.status_code == 403
