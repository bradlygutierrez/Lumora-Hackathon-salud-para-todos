import pytest

from helpers.medical import create_active_medical_professional
from sqlalchemy import select

from lumora_api.models import (
    CondicionMedica,
    ConsultaMedica,
    Diagnostico,
    EstadoCondicion,
    EstadoExpediente,
    Expediente,
    Paciente,
    Permiso,
    Persona,
    ProfesionalSalud,
    Rol,
    TipoDiagnostico,
    Usuario,
    UsuarioRol,
    roles_permisos,
)


async def _token(client, session_factory, username: str, *, clinical: bool) -> str:
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
    user = await client.post(
        "/api/v1/usuarios",
        json={
            "email": f"{username}@example.com",
            "username": username,
            "password": "safe-password",
            "persona": {"nombres": username, "apellidos": "J04"},
        },
    )
    assert user.status_code == 201
    async with session_factory() as session:
        stored = await session.get(Usuario, user.json()["id"])
        role = await session.scalar(select(Rol).where(Rol.nombre == f"Rol {username}"))
        session.add(UsuarioRol(usuario_id=stored.id, rol_id=role.id))
        if clinical: await create_active_medical_professional(session, user=stored)
        await session.commit()
    token = await client.post(
        "/api/v1/auth/token",
        data={"username": username, "password": "safe-password"},
    )
    assert token.status_code == 200
    return token.json()["access_token"]


async def _setup(session_factory):
    async with session_factory() as session:
        patient_person = Persona(nombres="Paciente", apellidos="J04")
        professional_person = Persona(nombres="Profesional", apellidos="J04")
        session.add_all([patient_person, professional_person])
        await session.flush()
        patient = Paciente(persona_id=patient_person.id)
        professional = ProfesionalSalud(
            persona_id=professional_person.id,
            especialidad="Medicina interna",
            numero_licencia="MED-J04",
        )
        record_state = EstadoExpediente(nombre="Activo")
        active = EstadoCondicion(nombre="Activa")
        resolved = EstadoCondicion(nombre="Resuelta")
        chronic = EstadoCondicion(nombre="Crónica")
        diagnosis_type = TipoDiagnostico(nombre="Confirmado")
        session.add_all(
            [patient, professional, record_state, active, resolved, chronic, diagnosis_type]
        )
        await session.flush()
        record = Expediente(
            paciente_id=patient.id,
            estado_expediente_id=record_state.id,
            numero_expediente="EXP-J04",
        )
        session.add(record)
        await session.flush()
        consultation = ConsultaMedica(
            expediente_id=record.id,
            paciente_id=patient.id,
            profesional_id=professional.id,
            motivo="Evaluación",
        )
        session.add(consultation)
        await session.commit()
        return {
            "consultation_id": consultation.id,
            "record_id": record.id,
            "professional_id": professional.id,
            "active_id": active.id,
            "resolved_id": resolved.id,
            "chronic_id": chronic.id,
            "diagnosis_type_id": diagnosis_type.id,
        }


@pytest.mark.asyncio
async def test_diagnoses_require_clinical_permission(client, session_factory):
    access_token = await _token(client, session_factory, "j04-no-clinical", clinical=False)
    response = await client.get(
        "/api/v1/consultas/1/diagnosticos",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_diagnoses_conditions_transitions_and_history(client, session_factory):
    access_token = await _token(client, session_factory, "j04-clinical", clinical=True)
    headers = {"Authorization": f"Bearer {access_token}"}
    setup = await _setup(session_factory)

    diagnosis = await client.post(
        f"/api/v1/consultas/{setup['consultation_id']}/diagnosticos",
        json={
            "tipo_diagnostico_id": setup["diagnosis_type_id"],
            "descripcion": "Hipertensión arterial",
            "es_principal": True,
        },
        headers=headers,
    )
    assert diagnosis.status_code == 201
    diagnosis_payload = diagnosis.json()
    diagnosis_id = diagnosis_payload["id"]
    assert diagnosis_payload["profesional_id"] == setup["professional_id"]

    bad_type = await client.post(
        f"/api/v1/consultas/{setup['consultation_id']}/diagnosticos",
        json={"tipo_diagnostico_id": 999, "descripcion": "Inválido"},
        headers=headers,
    )
    assert bad_type.status_code == 404

    condition = await client.post(
        f"/api/v1/expedientes/{setup['record_id']}/condiciones",
        json={
            "estado_condicion_id": setup["active_id"],
            "nombre": "Hipertensión",
            "diagnostico_id": diagnosis_id,
            "motivo_historial": "Diagnóstico inicial",
        },
        headers=headers,
    )
    assert condition.status_code == 201
    condition_id = condition.json()["id"]

    duplicate = await client.post(
        f"/api/v1/expedientes/{setup['record_id']}/condiciones",
        json={"estado_condicion_id": setup["active_id"], "nombre": "Hipertensión"},
        headers=headers,
    )
    assert duplicate.status_code == 409

    updated = await client.patch(
        f"/api/v1/condiciones/{condition_id}",
        json={
            "estado_condicion_id": setup["resolved_id"],
            "motivo_historial": "Tratamiento completado",
        },
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["estado_condicion_id"] == setup["resolved_id"]

    invalid_transition = await client.patch(
        f"/api/v1/condiciones/{condition_id}",
        json={"estado_condicion_id": setup["chronic_id"]},
        headers=headers,
    )
    assert invalid_transition.status_code == 409

    history = await client.get(
        f"/api/v1/condiciones/{condition_id}/historial",
        headers=headers,
    )
    assert history.status_code == 200
    actions = [item["accion"] for item in history.json()["items"]]
    assert actions == ["CREADA", "CAMBIO_ESTADO"]
    assert history.json()["items"][0]["usuario_id"] > 0

    assert (
        await client.delete(f"/api/v1/diagnosticos/{diagnosis_id}", headers=headers)
    ).status_code == 204
    assert (
        await client.delete(f"/api/v1/condiciones/{condition_id}", headers=headers)
    ).status_code == 204

    async with session_factory() as session:
        assert (await session.get(Diagnostico, diagnosis_id)).deleted_at is not None
        assert (await session.get(CondicionMedica, condition_id)).deleted_at is not None
