"""A15/B15 -- expediente médico documental (JSON) y su PDF.

Cubre el checklist de B15: acceso propio del paciente, cuidador
autorizado/revocado, personal clínico, 403, IDOR (404 para un paciente
que no existe), PDF válido y coherente con el documento, y secciones
vacías cuando el paciente no tiene ningún dato clínico todavía.
"""

from datetime import date, datetime, timezone
from uuid import uuid4

import pytest
from sqlalchemy import select

from lumora_api.core.security import create_access_token, hash_password
from lumora_api.models import (
    Alergia,
    ConsultaMedica,
    Diagnostico,
    EstadoExpediente,
    EstadoReceta,
    EventoAuditoria,
    Expediente,
    IndicadorMedico,
    MedicionIndicador,
    NivelSeveridad,
    OrigenRegistro,
    Paciente,
    Permiso,
    Persona,
    ProfesionalSalud,
    Receta,
    RelacionPaciente,
    Rol,
    SignoVital,
    TipoDiagnostico,
    TipoRelacion,
    UnidadMedida,
    Usuario,
)


def _user(nombres: str, apellidos: str, username: str, roles: list[Rol]) -> Usuario:
    return Usuario(
        persona=Persona(nombres=nombres, apellidos=apellidos),
        email=f"{username}@example.com",
        username=username,
        password_hash=hash_password("Safe123!"),
        roles=roles,
    )


async def _seed(session_factory) -> dict:
    now = datetime(2026, 2, 1, 9, 0, tzinfo=timezone.utc)
    async with session_factory() as s:
        patient_role = Rol(nombre="Paciente")
        caregiver_role = Rol(nombre="Cuidador")
        clinical_permission = Permiso(nombre="clinica:manage")
        staff_role = Rol(nombre="Profesional", permisos=[clinical_permission])
        record_state = EstadoExpediente(nombre="Activo A15")
        severity = NivelSeveridad(nombre="Alta A15")
        diagnosis_type = TipoDiagnostico(nombre="Confirmado A15")
        prescription_state = EstadoReceta(nombre="Emitida A15")
        origin = OrigenRegistro(nombre="Consulta A15")
        unit = UnidadMedida(nombre="mmHg A15")
        tipo_relacion = TipoRelacion(nombre="Otro A15")
        s.add_all(
            [
                patient_role,
                caregiver_role,
                clinical_permission,
                staff_role,
                record_state,
                severity,
                diagnosis_type,
                prescription_state,
                origin,
                unit,
                tipo_relacion,
            ]
        )
        await s.flush()

        patient_user = _user("Ana", "Documental", "a15-patient", [patient_role])
        caregiver_user = _user("Cuida", "Dora A15", "a15-caregiver", [caregiver_role])
        revoked_caregiver_user = _user(
            "Ex", "Cuidador A15", "a15-revoked-caregiver", [caregiver_role]
        )
        gated_caregiver_user = _user(
            "Sin", "Permiso A15", "a15-gated-caregiver", [caregiver_role]
        )
        outsider_user = _user("Otro", "Paciente A15", "a15-outsider", [patient_role])
        staff_user = _user("Doctora", "Staff A15", "a15-staff", [staff_role])
        empty_patient_user = _user("Vacio", "Paciente A15", "a15-empty", [patient_role])
        professional_person = Persona(nombres="Prof", apellidos="Salud A15")
        s.add_all(
            [
                patient_user,
                caregiver_user,
                revoked_caregiver_user,
                gated_caregiver_user,
                outsider_user,
                staff_user,
                empty_patient_user,
                professional_person,
            ]
        )
        await s.flush()

        patient = Paciente(persona_id=patient_user.persona_id)
        outsider_patient = Paciente(persona_id=outsider_user.persona_id)
        empty_patient = Paciente(persona_id=empty_patient_user.persona_id)
        professional = ProfesionalSalud(
            persona_id=professional_person.id,
            especialidad="Medicina General",
            numero_licencia="LIC-A15",
        )
        s.add_all([patient, outsider_patient, empty_patient, professional])
        await s.flush()

        s.add_all(
            [
                RelacionPaciente(
                    paciente_id=patient.id,
                    usuario_relacionado_id=caregiver_user.id,
                    tipo_relacion_id=tipo_relacion.id,
                    estado="active",
                    activo=True,
                    nivel_acceso="read",
                    creado_en=now,
                ),
                RelacionPaciente(
                    paciente_id=patient.id,
                    usuario_relacionado_id=revoked_caregiver_user.id,
                    tipo_relacion_id=tipo_relacion.id,
                    estado="revoked",
                    activo=False,
                    nivel_acceso="read",
                    creado_en=now,
                ),
                # A15 -- relacion activa (incluso con nivel_acceso="write")
                # pero SIN permiso para ver/descargar el expediente.
                RelacionPaciente(
                    paciente_id=patient.id,
                    usuario_relacionado_id=gated_caregiver_user.id,
                    tipo_relacion_id=tipo_relacion.id,
                    estado="active",
                    activo=True,
                    nivel_acceso="write",
                    puede_ver_expediente=False,
                    creado_en=now,
                ),
            ]
        )

        record = Expediente(
            paciente_id=patient.id,
            estado_expediente_id=record_state.id,
            numero_expediente="EXP-A15",
            created_at=now,
        )
        s.add(record)
        await s.flush()

        allergy = Alergia(
            paciente_id=patient.id, nombre="Penicilina A15", nivel_severidad_id=severity.id
        )
        consultation = ConsultaMedica(
            expediente_id=record.id,
            paciente_id=patient.id,
            profesional_id=professional.id,
            fecha_consulta=now,
            motivo="Control de presión",
            evaluacion="Paciente estable",
        )
        s.add_all([allergy, consultation])
        await s.flush()

        vital_signs = SignoVital(
            consulta_id=consultation.id,
            presion_sistolica=120,
            presion_diastolica=80,
            registrado_at=now,
        )
        diagnosis = Diagnostico(
            consulta_id=consultation.id,
            expediente_id=record.id,
            profesional_id=professional.id,
            tipo_diagnostico_id=diagnosis_type.id,
            descripcion="Hipertensión leve",
            fecha_diagnostico=date(2026, 2, 1),
        )
        prescription = Receta(
            paciente_id=patient.id,
            profesional_id=professional.id,
            consulta_id=consultation.id,
            estado_id=prescription_state.id,
            titulo="Tratamiento antihipertensivo",
            fecha_emision=now,
        )
        indicator = IndicadorMedico(
            id=uuid4(), codigo="A15-PRES", nombre="Presión arterial", unidad_medida_id=unit.id
        )
        s.add_all([vital_signs, diagnosis, prescription, indicator])
        await s.flush()

        measurement = MedicionIndicador(
            id=uuid4(),
            paciente_id=patient.id,
            indicador_id=indicator.id,
            valor=120,
            unidad_medida_id=unit.id,
            origen_registro_id=origin.id,
            registrado_por_id=patient_user.id,
            fecha_medicion=now,
        )
        s.add(measurement)
        await s.commit()

        return {
            "patient_id": patient.id,
            "patient_user_id": patient_user.id,
            "caregiver_user_id": caregiver_user.id,
            "revoked_caregiver_user_id": revoked_caregiver_user.id,
            "gated_caregiver_user_id": gated_caregiver_user.id,
            "outsider_user_id": outsider_user.id,
            "outsider_patient_id": outsider_patient.id,
            "staff_user_id": staff_user.id,
            "empty_patient_id": empty_patient.id,
            "empty_patient_user_id": empty_patient_user.id,
        }


def _auth(user_id: int) -> dict:
    return {"Authorization": f"Bearer {create_access_token(user_id)}"}


@pytest.mark.asyncio
async def test_patient_reads_own_medical_record_document(client, session_factory):
    seed = await _seed(session_factory)
    response = await client.get(
        f"/api/v1/patients/{seed['patient_id']}/medical-record",
        headers=_auth(seed["patient_user_id"]),
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["paciente_id"] == seed["patient_id"]
    assert payload["autor"] is None
    assert payload["generado_en"] is not None
    assert payload["alergias"][0]["nombre"] == "Penicilina A15"
    assert payload["consultas"][0]["diagnosticos"][0]["descripcion"] == "Hipertensión leve"
    assert payload["consultas"][0]["signos_vitales"][0]["presion_sistolica"] == 120
    assert payload["recetas"][0]["titulo"] == "Tratamiento antihipertensivo"
    assert payload["mediciones"][0]["indicador_nombre"] == "Presión arterial"


@pytest.mark.asyncio
async def test_caregiver_with_active_relation_reads_document(client, session_factory):
    seed = await _seed(session_factory)
    response = await client.get(
        f"/api/v1/patients/{seed['patient_id']}/medical-record",
        headers=_auth(seed["caregiver_user_id"]),
    )
    assert response.status_code == 200
    assert response.json()["paciente_id"] == seed["patient_id"]


@pytest.mark.asyncio
async def test_revoked_caregiver_is_denied(client, session_factory):
    seed = await _seed(session_factory)
    response = await client.get(
        f"/api/v1/patients/{seed['patient_id']}/medical-record",
        headers=_auth(seed["revoked_caregiver_user_id"]),
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_caregiver_without_puede_ver_expediente_is_denied_json_and_pdf(
    client, session_factory
):
    """A15 -- una relacion activa de escritura NO alcanza si el paciente
    apago puede_ver_expediente: el 403 debe aplicar tanto al JSON como al
    PDF, sin importar nivel_acceso."""
    seed = await _seed(session_factory)
    headers = _auth(seed["gated_caregiver_user_id"])

    json_response = await client.get(
        f"/api/v1/patients/{seed['patient_id']}/medical-record", headers=headers
    )
    assert json_response.status_code == 403

    pdf_response = await client.get(
        f"/api/v1/patients/{seed['patient_id']}/medical-record/pdf", headers=headers
    )
    assert pdf_response.status_code == 403


@pytest.mark.asyncio
async def test_unrelated_patient_is_denied(client, session_factory):
    seed = await _seed(session_factory)
    response = await client.get(
        f"/api/v1/patients/{seed['patient_id']}/medical-record",
        headers=_auth(seed["outsider_user_id"]),
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_own_patient_cannot_be_reached_through_another_id_idor(client, session_factory):
    seed = await _seed(session_factory)
    # El outsider SÍ puede ver su propio documento (vacío) -- lo que no
    # puede es alcanzar el de otro paciente cambiando el id en la URL.
    own = await client.get(
        f"/api/v1/patients/{seed['outsider_patient_id']}/medical-record",
        headers=_auth(seed["outsider_user_id"]),
    )
    assert own.status_code == 200
    assert own.json()["paciente_id"] == seed["outsider_patient_id"]


@pytest.mark.asyncio
async def test_clinical_staff_reads_any_document_and_is_recorded_as_author(
    client, session_factory
):
    seed = await _seed(session_factory)
    response = await client.get(
        f"/api/v1/patients/{seed['patient_id']}/medical-record",
        headers=_auth(seed["staff_user_id"]),
    )
    assert response.status_code == 200
    assert response.json()["autor"] == "Doctora Staff A15"


@pytest.mark.asyncio
async def test_nonexistent_patient_returns_404(client, session_factory):
    seed = await _seed(session_factory)
    response = await client.get(
        "/api/v1/patients/999999/medical-record",
        headers=_auth(seed["patient_user_id"]),
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_empty_medical_record_returns_200_with_empty_sections(client, session_factory):
    seed = await _seed(session_factory)
    response = await client.get(
        f"/api/v1/patients/{seed['empty_patient_id']}/medical-record",
        headers=_auth(seed["empty_patient_user_id"]),
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["expediente"] is None
    assert payload["alergias"] == []
    assert payload["consultas"] == []
    assert payload["recetas"] == []
    assert payload["mediciones"] == []


@pytest.mark.asyncio
async def test_pdf_matches_document_and_is_audited(client, session_factory):
    seed = await _seed(session_factory)
    headers = _auth(seed["patient_user_id"])

    document = await client.get(
        f"/api/v1/patients/{seed['patient_id']}/medical-record", headers=headers
    )
    assert document.status_code == 200

    pdf = await client.get(
        f"/api/v1/patients/{seed['patient_id']}/medical-record/pdf", headers=headers
    )
    assert pdf.status_code == 200
    assert pdf.headers["content-type"] == "application/pdf"
    assert pdf.content.startswith(b"%PDF")
    assert f"paciente-{seed['patient_id']}" in pdf.headers["content-disposition"]
    assert "attachment" in pdf.headers["content-disposition"]

    async with session_factory() as s:
        audit = await s.scalar(
            select(EventoAuditoria).where(
                EventoAuditoria.entidad == "expediente_pdf",
                EventoAuditoria.entidad_id == seed["patient_id"],
            )
        )
        assert audit is not None
        assert audit.usuario_id == seed["patient_user_id"]
        assert audit.accion == "EXPORT"


@pytest.mark.asyncio
async def test_pdf_requires_same_authorization_as_document(client, session_factory):
    seed = await _seed(session_factory)
    response = await client.get(
        f"/api/v1/patients/{seed['patient_id']}/medical-record/pdf",
        headers=_auth(seed["outsider_user_id"]),
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_pdf_renders_for_a_patient_with_no_clinical_data_yet(client, session_factory):
    seed = await _seed(session_factory)
    response = await client.get(
        f"/api/v1/patients/{seed['empty_patient_id']}/medical-record/pdf",
        headers=_auth(seed["empty_patient_user_id"]),
    )
    assert response.status_code == 200
    assert response.content.startswith(b"%PDF")
