from datetime import datetime, timedelta, timezone

import pytest

from helpers.medical import create_active_medical_professional
from sqlalchemy import select

from lumora_api.models import (
    Cita,
    EstadoExpediente,
    Expediente,
    MotivoConsulta,
    Paciente,
    Permiso,
    Persona,
    ProfesionalSalud,
    Rol,
    Usuario,
    UsuarioRol,
    roles_permisos,
)


async def _token(
    client, session_factory, username: str, *, clinical: bool
) -> tuple[str, int | None]:
    async with session_factory() as session:
        if await session.scalar(select(Rol).where(Rol.nombre == "Paciente")) is None:
            session.add(Rol(nombre="Paciente"))
        role = Rol(nombre=f"Rol {username}")
        session.add(role)
        await session.flush()
        if clinical:
            permission = await session.scalar(
                select(Permiso).where(Permiso.nombre == "clinica:manage")
            )
            if permission is None:
                permission = Permiso(nombre="clinica:manage")
                session.add(permission)
                await session.flush()
            await session.execute(
                roles_permisos.insert().values(rol_id=role.id, permiso_id=permission.id)
            )
        await session.commit()
    created = await client.post(
        "/api/v1/usuarios",
        json={
            "email": f"{username}@example.com",
            "username": username,
            "password": "safe-password",
            "persona": {"nombres": username, "apellidos": "Consulta"},
        },
    )
    assert created.status_code == 201
    professional_id = None
    async with session_factory() as session:
        user = await session.get(Usuario, created.json()["id"])
        role = await session.scalar(select(Rol).where(Rol.nombre == f"Rol {username}"))
        session.add(UsuarioRol(usuario_id=user.id, rol_id=role.id))
        if clinical:
            result = await create_active_medical_professional(session, user=user)
            professional_id = result["professional"].id
        await session.commit()
    token = await client.post(
        "/api/v1/auth/token",
        data={"username": username, "password": "safe-password"},
    )
    assert token.status_code == 200
    return token.json()["access_token"], professional_id


async def _setup(session_factory, professional_id: int):
    async with session_factory() as session:
        patient_person = Persona(nombres="Paciente", apellidos="Consulta")
        session.add(patient_person)
        await session.flush()
        patient = Paciente(persona_id=patient_person.id)
        state = EstadoExpediente(nombre="Activo")
        reason = MotivoConsulta(nombre="Control")
        session.add_all([patient, state, reason])
        await session.flush()
        record = Expediente(
            paciente_id=patient.id,
            estado_expediente_id=state.id,
            numero_expediente="EXP-J03",
        )
        session.add(record)
        # Cita previa: bootstrap legítimo de la relación profesional-paciente,
        # igual que exige ensure_patient_is_assigned_to_professional.
        now = datetime.now(timezone.utc)
        session.add(
            Cita(
                paciente_id=patient.id,
                profesional_id=professional_id,
                inicio=now,
                fin=now + timedelta(minutes=30),
            )
        )
        await session.commit()
        return {
            "patient_id": patient.id,
            "professional_id": professional_id,
            "record_id": record.id,
            "reason_id": reason.id,
        }


@pytest.mark.asyncio
async def test_consultations_require_clinical_permission(client, session_factory):
    access_token, _ = await _token(client, session_factory, "no-clinical-j03", clinical=False)
    response = await client.get(
        "/api/v1/consultas",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"


@pytest.mark.asyncio
async def test_consultation_vital_signs_notes_and_filters(client, session_factory):
    access_token, professional_id = await _token(
        client, session_factory, "clinical-j03", clinical=True
    )
    headers = {"Authorization": f"Bearer {access_token}"}
    setup = await _setup(session_factory, professional_id)

    consultation = await client.post(
        "/api/v1/consultas",
        json={
            "expediente_id": setup["record_id"],
            "paciente_id": setup["patient_id"],
            "profesional_id": setup["professional_id"],
            "motivo_consulta_id": setup["reason_id"],
            "motivo": "Control general",
            "sintomas": "Sin síntomas agudos",
        },
        headers=headers,
    )
    assert consultation.status_code == 201
    consultation_id = consultation.json()["id"]

    invalid_relation = await client.post(
        "/api/v1/consultas",
        json={
            "expediente_id": setup["record_id"],
            "paciente_id": 999,
            "profesional_id": setup["professional_id"],
        },
        headers=headers,
    )
    assert invalid_relation.status_code == 404

    filtered = await client.get(
        f"/api/v1/expedientes/{setup['record_id']}/consultas",
        params={"limit": 1, "offset": 0, "activo": True},
        headers=headers,
    )
    assert filtered.status_code == 200
    assert filtered.json()["total"] == 1
    assert filtered.json()["items"][0]["id"] == consultation_id

    updated = await client.patch(
        f"/api/v1/consultas/{consultation_id}",
        json={"evaluacion": "Paciente estable"},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["evaluacion"] == "Paciente estable"

    invalid_vitals = await client.post(
        f"/api/v1/consultas/{consultation_id}/signos-vitales",
        json={"temperatura_c": 55},
        headers=headers,
    )
    assert invalid_vitals.status_code == 422

    vitals = await client.post(
        f"/api/v1/consultas/{consultation_id}/signos-vitales",
        json={
            "temperatura_c": 36.7,
            "frecuencia_cardiaca": 72,
            "presion_sistolica": 120,
            "presion_diastolica": 80,
            "saturacion_oxigeno": 98,
        },
        headers=headers,
    )
    assert vitals.status_code == 201
    assert vitals.json()["consulta_id"] == consultation_id

    listed_vitals = await client.get(
        f"/api/v1/consultas/{consultation_id}/signos-vitales",
        headers=headers,
    )
    assert listed_vitals.json()["total"] == 1

    note = await client.post(
        f"/api/v1/consultas/{consultation_id}/notas",
        json={"contenido": "Nota inicial"},
        headers=headers,
    )
    assert note.status_code == 201
    note_payload = note.json()
    assert note_payload["autor_id"] > 0
    assert note_payload["created_at"] is not None
    note_id = note_payload["id"]

    patched_note = await client.patch(
        f"/api/v1/consultas/{consultation_id}/notas/{note_id}",
        json={"contenido": "Nota actualizada", "activo": False},
        headers=headers,
    )
    assert patched_note.status_code == 200
    assert patched_note.json()["contenido"] == "Nota actualizada"
    assert patched_note.json()["activo"] is False

    inactive_notes = await client.get(
        f"/api/v1/consultas/{consultation_id}/notas",
        params={"activo": False},
        headers=headers,
    )
    assert inactive_notes.json()["items"][0]["id"] == note_id


@pytest.mark.asyncio
async def test_staff_cannot_create_consultation_for_a_patient_with_no_relationship(
    client, session_factory
):
    access_token, professional_id = await _token(
        client, session_factory, "clinical-no-relation", clinical=True
    )
    headers = {"Authorization": f"Bearer {access_token}"}
    async with session_factory() as session:
        patient_person = Persona(nombres="Paciente", apellidos="SinRelacion")
        session.add(patient_person)
        await session.flush()
        patient = Paciente(persona_id=patient_person.id)
        state = EstadoExpediente(nombre="Activo")
        reason = MotivoConsulta(nombre="Control")
        session.add_all([patient, state, reason])
        await session.flush()
        record = Expediente(
            paciente_id=patient.id,
            estado_expediente_id=state.id,
            numero_expediente="EXP-SIN-RELACION",
        )
        session.add(record)
        await session.commit()
        patient_id = patient.id
        record_id = record.id
        reason_id = reason.id

    response = await client.post(
        "/api/v1/consultas",
        json={
            "expediente_id": record_id,
            "paciente_id": patient_id,
            "profesional_id": professional_id,
            "motivo_consulta_id": reason_id,
            "motivo": "Control general",
        },
        headers=headers,
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"


@pytest.mark.asyncio
async def test_staff_cannot_create_consultation_as_another_professional(
    client, session_factory
):
    access_token, professional_id = await _token(
        client, session_factory, "clinical-impersonator", clinical=True
    )
    headers = {"Authorization": f"Bearer {access_token}"}
    setup = await _setup(session_factory, professional_id)

    async with session_factory() as session:
        other_person = Persona(nombres="Otro", apellidos="Profesional")
        session.add(other_person)
        await session.flush()
        other_professional = ProfesionalSalud(
            persona_id=other_person.id,
            especialidad="Neurología",
            numero_licencia="MED-OTHER",
        )
        session.add(other_professional)
        await session.commit()
        other_professional_id = other_professional.id

    response = await client.post(
        "/api/v1/consultas",
        json={
            "expediente_id": setup["record_id"],
            "paciente_id": setup["patient_id"],
            "profesional_id": other_professional_id,
            "motivo_consulta_id": setup["reason_id"],
            "motivo": "Control general",
        },
        headers=headers,
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"


@pytest.mark.asyncio
async def test_staff_cannot_add_a_note_to_a_patient_with_no_relationship(
    client, session_factory
):
    # Consulta real de OTRO profesional, con SU paciente.
    owner_token, owner_professional_id = await _token(
        client, session_factory, "clinical-note-owner", clinical=True
    )
    owner_setup = await _setup(session_factory, owner_professional_id)
    consultation = await client.post(
        "/api/v1/consultas",
        json={
            "expediente_id": owner_setup["record_id"],
            "paciente_id": owner_setup["patient_id"],
            "profesional_id": owner_professional_id,
            "motivo_consulta_id": owner_setup["reason_id"],
            "motivo": "Control general",
        },
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert consultation.status_code == 201
    consultation_id = consultation.json()["id"]

    # Otro profesional clínico, sin ninguna relación con ese paciente.
    outsider_token, _ = await _token(
        client, session_factory, "clinical-note-outsider", clinical=True
    )
    response = await client.post(
        f"/api/v1/consultas/{consultation_id}/notas",
        json={"contenido": "Nota no autorizada"},
        headers={"Authorization": f"Bearer {outsider_token}"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"
