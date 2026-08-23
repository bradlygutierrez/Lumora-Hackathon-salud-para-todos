from datetime import datetime, timezone
from uuid import uuid4

import pytest
from sqlalchemy import select

from lumora_api.models import (
    Alergia,
    AlertaClinica,
    AntecedenteMedico,
    CondicionMedica,
    ConsultaMedica,
    Diagnostico,
    Discapacidad,
    EstadoCondicion,
    EstadoExpediente,
    EstadoReceta,
    EventoAuditoria,
    Expediente,
    IndicadorMedico,
    MedicionIndicador,
    NivelSeveridad,
    NotaClinica,
    OrigenRegistro,
    Paciente,
    Permiso,
    Persona,
    ProfesionalSalud,
    Receta,
    Rol,
    SignoVital,
    TipoAlerta,
    TipoAntecedente,
    TipoDiagnostico,
    UnidadMedida,
    Usuario,
    UsuarioRol,
    roles_permisos,
)


async def _token(client, session_factory, username: str, *, clinical: bool) -> tuple[str, int]:
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
            "persona": {"nombres": username, "apellidos": "J05"},
        },
    )
    assert created.status_code == 201
    user_id = created.json()["id"]

    async with session_factory() as session:
        role = await session.scalar(select(Rol).where(Rol.nombre == f"Rol {username}"))
        session.add(UsuarioRol(usuario_id=user_id, rol_id=role.id))
        await session.commit()

    token = await client.post(
        "/api/v1/auth/token",
        data={"username": username, "password": "safe-password"},
    )
    assert token.status_code == 200
    return token.json()["access_token"], user_id


async def _setup(session_factory, user_id: int):
    now = datetime(2026, 1, 10, 8, 0, tzinfo=timezone.utc)
    async with session_factory() as session:
        patient_person = Persona(nombres="Paciente", apellidos="J05")
        professional_person = Persona(nombres="Profesional", apellidos="J05")
        session.add_all([patient_person, professional_person])
        await session.flush()

        patient = Paciente(persona_id=patient_person.id)
        professional = ProfesionalSalud(
            persona_id=professional_person.id,
            especialidad="Medicina familiar",
            numero_licencia="MED-J05",
        )
        record_state = EstadoExpediente(nombre="Activo")
        condition_state = EstadoCondicion(nombre="Activa")
        history_type = TipoAntecedente(nombre="Familiar")
        diagnosis_type = TipoDiagnostico(nombre="Confirmado")
        prescription_state = EstadoReceta(nombre="Emitida")
        severity = NivelSeveridad(nombre="Alta")
        alert_type = TipoAlerta(nombre="Clínica")
        origin = OrigenRegistro(nombre="Consulta")
        unit = UnidadMedida(nombre="mg/dL")
        session.add_all(
            [
                patient,
                professional,
                record_state,
                condition_state,
                history_type,
                diagnosis_type,
                prescription_state,
                severity,
                alert_type,
                origin,
                unit,
            ]
        )
        await session.flush()

        record = Expediente(
            paciente_id=patient.id,
            estado_expediente_id=record_state.id,
            numero_expediente="EXP-J05",
            created_at=now,
        )
        session.add(record)
        await session.flush()

        history = AntecedenteMedico(
            expediente_id=record.id,
            tipo_antecedente_id=history_type.id,
            descripcion="Diabetes familiar",
            fecha=now.date(),
        )
        allergy = Alergia(
            paciente_id=patient.id,
            nombre="Penicilina",
            nivel_severidad_id=severity.id,
            estado_condicion_id=condition_state.id,
        )
        disability = Discapacidad(
            paciente_id=patient.id,
            nombre="Movilidad reducida",
            estado_condicion_id=condition_state.id,
        )
        consultation = ConsultaMedica(
            expediente_id=record.id,
            paciente_id=patient.id,
            profesional_id=professional.id,
            fecha_consulta=now.replace(hour=9),
            motivo="Control metabólico",
            evaluacion="Paciente estable",
        )
        session.add_all([history, allergy, disability, consultation])
        await session.flush()

        vital_signs = SignoVital(
            consulta_id=consultation.id,
            glucosa_mg_dl=145,
            registrado_at=now.replace(hour=9, minute=5),
        )
        note = NotaClinica(
            consulta_id=consultation.id,
            autor_id=user_id,
            contenido="Ajustar alimentación",
            created_at=now.replace(hour=9, minute=10),
        )
        hidden_note = NotaClinica(
            consulta_id=consultation.id,
            autor_id=user_id,
            contenido="No debe aparecer",
            activo=False,
            deleted_at=now,
        )
        diagnosis = Diagnostico(
            consulta_id=consultation.id,
            expediente_id=record.id,
            profesional_id=professional.id,
            tipo_diagnostico_id=diagnosis_type.id,
            descripcion="Prediabetes",
            fecha_diagnostico=now.date(),
        )
        condition = CondicionMedica(
            expediente_id=record.id,
            paciente_id=patient.id,
            estado_condicion_id=condition_state.id,
            nombre="Riesgo metabólico",
            fecha_inicio=now.date(),
        )
        session.add_all([vital_signs, note, hidden_note, diagnosis, condition])
        await session.flush()

        prescription = Receta(
            paciente_id=patient.id,
            profesional_id=professional.id,
            consulta_id=consultation.id,
            estado_id=prescription_state.id,
            fecha_emision=now.replace(hour=10),
            observaciones="Plan nutricional indicado",
        )
        indicator = IndicadorMedico(
            id=uuid4(),
            codigo="GLU-J05",
            nombre="Glucosa",
            unidad_medida_id=unit.id,
        )
        session.add_all([prescription, indicator])
        await session.flush()

        measurement = MedicionIndicador(
            id=uuid4(),
            paciente_id=patient.id,
            indicador_id=indicator.id,
            valor=145,
            unidad_medida_id=unit.id,
            origen_registro_id=origin.id,
            registrado_por_id=user_id,
            fecha_medicion=now.replace(hour=9, minute=6),
        )
        session.add(measurement)
        await session.flush()
        alert = AlertaClinica(
            id=uuid4(),
            paciente_id=patient.id,
            medicion_id=measurement.id,
            nivel_severidad_id=severity.id,
            tipo_alerta_id=alert_type.id,
            origen_registro_id=origin.id,
            mensaje="Glucosa por encima del objetivo",
            fecha_alerta=now.replace(hour=9, minute=7),
        )
        audit = EventoAuditoria(
            usuario_id=user_id,
            accion="UPDATE",
            entidad="consultas_medicas",
            entidad_id=consultation.id,
            created_at=now.replace(hour=9, minute=20),
        )
        session.add_all([alert, audit])
        await session.commit()

        return {
            "patient_id": patient.id,
            "record_id": record.id,
            "consultation_id": consultation.id,
        }


@pytest.mark.asyncio
async def test_clinical_integration_requires_clinical_permission(client, session_factory):
    access_token, _ = await _token(
        client, session_factory, "j05-no-clinical", clinical=False
    )
    response = await client.get(
        "/api/v1/pacientes/1/resumen-clinico",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_clinical_summary_timeline_and_search(client, session_factory):
    access_token, user_id = await _token(
        client, session_factory, "j05-clinical", clinical=True
    )
    headers = {"Authorization": f"Bearer {access_token}"}
    setup = await _setup(session_factory, user_id)

    summary = await client.get(
        f"/api/v1/pacientes/{setup['patient_id']}/resumen-clinico",
        headers=headers,
    )
    assert summary.status_code == 200
    payload = summary.json()
    assert payload["expediente"]["id"] == setup["record_id"]
    assert payload["antecedentes"][0]["descripcion"] == "Diabetes familiar"
    assert payload["alergias"][0]["nombre"] == "Penicilina"
    assert payload["discapacidades"][0]["nombre"] == "Movilidad reducida"
    assert payload["condiciones"][0]["nombre"] == "Riesgo metabólico"
    assert payload["consultas"][0]["consulta"]["id"] == setup["consultation_id"]
    assert payload["consultas"][0]["signos_vitales"][0]["glucosa_mg_dl"] == 145
    assert payload["consultas"][0]["notas"][0]["contenido"] == "Ajustar alimentación"
    assert payload["consultas"][0]["diagnosticos"][0]["descripcion"] == "Prediabetes"
    assert "deleted_at" not in payload["consultas"][0]["notas"][0]
    assert all(
        note["contenido"] != "No debe aparecer"
        for consultation in payload["consultas"]
        for note in consultation["notas"]
    )

    timeline = await client.get(
        f"/api/v1/expedientes/{setup['record_id']}/timeline",
        headers=headers,
    )
    assert timeline.status_code == 200
    timeline_payload = timeline.json()
    types = [item["tipo"] for item in timeline_payload["items"]]
    assert {"consulta", "signos_vitales", "nota", "diagnostico", "condicion"}.issubset(
        types
    )
    assert {"receta", "alerta", "auditoria"}.issubset(types)
    assert [item["occurred_at"] for item in timeline_payload["items"]] == sorted(
        item["occurred_at"] for item in timeline_payload["items"]
    )

    filtered_timeline = await client.get(
        f"/api/v1/expedientes/{setup['record_id']}/timeline",
        params={"tipo": "alerta"},
        headers=headers,
    )
    assert filtered_timeline.status_code == 200
    assert filtered_timeline.json()["items"][0]["detalle"] == "Glucosa por encima del objetivo"

    search = await client.get(
        "/api/v1/clinica/busqueda",
        params={"paciente_id": setup["patient_id"], "q": "glucosa", "limit": 5},
        headers=headers,
    )
    assert search.status_code == 200
    assert search.json()["total"] >= 1
    assert any(item["tipo"] == "alerta" for item in search.json()["items"])

    not_found = await client.get(
        "/api/v1/pacientes/999/resumen-clinico",
        headers=headers,
    )
    assert not_found.status_code == 404
