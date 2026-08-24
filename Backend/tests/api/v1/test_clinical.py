import pytest
from sqlalchemy import select

from lumora_api.models import (
    Alergia,
    Discapacidad,
    EstadoCondicion,
    EstadoExpediente,
    NivelSeveridad,
    Paciente,
    Permiso,
    Persona,
    Rol,
    UsuarioRol,
    TipoAntecedente,
    Usuario,
    roles_permisos,
)


async def _register(client, session_factory, username: str, *, clinical: bool) -> str:
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
    response = await client.post(
        "/api/v1/usuarios",
        json={
            "email": f"{username}@example.com",
            "username": username,
            "password": "safe-password",
            "persona": {"nombres": username, "apellidos": "Clínico"},
        },
    )
    assert response.status_code == 201
    async with session_factory() as session:
        user = await session.get(Usuario, response.json()["id"])
        role = await session.scalar(select(Rol).where(Rol.nombre == f"Rol {username}"))
        session.add(UsuarioRol(usuario_id=user.id, rol_id=role.id))
        await session.commit()
    token = await client.post(
        "/api/v1/auth/token",
        data={"username": username, "password": "safe-password"},
    )
    assert token.status_code == 200
    return token.json()["access_token"]


async def _clinical_setup(session_factory):
    async with session_factory() as session:
        person = Persona(nombres="Paciente", apellidos="J02")
        session.add(person)
        await session.flush()
        patient = Paciente(persona_id=person.id)
        active = EstadoExpediente(nombre="Activo")
        history_type = TipoAntecedente(nombre="Familiar")
        condition = EstadoCondicion(nombre="Activa")
        severity = NivelSeveridad(nombre="Alta")
        session.add_all([patient, active, history_type, condition, severity])
        await session.commit()
        return {
            "patient_id": patient.id,
            "state_id": active.id,
            "history_type_id": history_type.id,
            "condition_id": condition.id,
            "severity_id": severity.id,
        }


@pytest.mark.asyncio
async def test_clinical_routes_require_clinical_permission(client, session_factory):
    access_token = await _register(client, session_factory, "plain", clinical=False)
    response = await client.get(
        "/api/v1/expedientes",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"


@pytest.mark.asyncio
async def test_medical_record_history_allergies_and_disabilities_flow(client, session_factory):
    access_token = await _register(client, session_factory, "clinician", clinical=True)
    headers = {"Authorization": f"Bearer {access_token}"}
    setup = await _clinical_setup(session_factory)

    record = await client.post(
        "/api/v1/expedientes",
        json={
            "paciente_id": setup["patient_id"],
            "estado_expediente_id": setup["state_id"],
            "numero_expediente": "EXP-001",
        },
        headers=headers,
    )
    assert record.status_code == 201
    record_id = record.json()["id"]

    duplicate_record = await client.post(
        "/api/v1/expedientes",
        json={
            "paciente_id": setup["patient_id"],
            "estado_expediente_id": setup["state_id"],
            "numero_expediente": "EXP-002",
        },
        headers=headers,
    )
    assert duplicate_record.status_code == 409

    missing_fk = await client.post(
        "/api/v1/expedientes",
        json={
            "paciente_id": 999,
            "estado_expediente_id": setup["state_id"],
            "numero_expediente": "EXP-003",
        },
        headers=headers,
    )
    assert missing_fk.status_code == 404

    history = await client.post(
        f"/api/v1/expedientes/{record_id}/antecedentes",
        json={
            "tipo_antecedente_id": setup["history_type_id"],
            "descripcion": "Diabetes familiar",
        },
        headers=headers,
    )
    assert history.status_code == 201
    history_id = history.json()["id"]
    assert (
        await client.post(
            f"/api/v1/expedientes/{record_id}/antecedentes",
            json={
                "tipo_antecedente_id": setup["history_type_id"],
                "descripcion": "Diabetes familiar",
            },
            headers=headers,
        )
    ).status_code == 409

    allergy = await client.post(
        f"/api/v1/pacientes/{setup['patient_id']}/alergias",
        json={
            "nombre": "Penicilina",
            "nivel_severidad_id": setup["severity_id"],
            "estado_condicion_id": setup["condition_id"],
        },
        headers=headers,
    )
    assert allergy.status_code == 201
    allergy_id = allergy.json()["id"]
    assert (
        await client.post(
            f"/api/v1/pacientes/{setup['patient_id']}/alergias",
            json={"nombre": "Penicilina"},
            headers=headers,
        )
    ).status_code == 409
    assert (
        await client.patch(
            f"/api/v1/pacientes/{setup['patient_id']}/alergias/{allergy_id}",
            json={"activo": False},
            headers=headers,
        )
    ).json()["activo"] is False
    inactive_allergies = await client.get(
        f"/api/v1/pacientes/{setup['patient_id']}/alergias",
        params={"activo": False},
        headers=headers,
    )
    assert inactive_allergies.json()["items"][0]["activo"] is False
    await client.patch(
        f"/api/v1/pacientes/{setup['patient_id']}/alergias/{allergy_id}",
        json={"activo": True},
        headers=headers,
    )

    disability = await client.post(
        f"/api/v1/pacientes/{setup['patient_id']}/discapacidades",
        json={"nombre": "Movilidad reducida", "estado_condicion_id": setup["condition_id"]},
        headers=headers,
    )
    assert disability.status_code == 201
    disability_id = disability.json()["id"]

    assert (
        await client.delete(
            f"/api/v1/expedientes/{record_id}/antecedentes/{history_id}",
            headers=headers,
        )
    ).status_code == 204
    assert (
        await client.delete(
            f"/api/v1/pacientes/{setup['patient_id']}/alergias/{allergy_id}",
            headers=headers,
        )
    ).status_code == 204
    assert (
        await client.delete(
            f"/api/v1/pacientes/{setup['patient_id']}/discapacidades/{disability_id}",
            headers=headers,
        )
    ).status_code == 204

    async with session_factory() as session:
        assert await session.get(Alergia, allergy_id) is not None
        assert await session.get(Discapacidad, disability_id) is not None
