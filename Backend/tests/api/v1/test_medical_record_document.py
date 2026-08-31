from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from sqlalchemy import select

from lumora_api.core.security import hash_password
from lumora_api.models import (
    Alergia, AntecedenteMedico, CondicionMedica, ConsultaMedica, DetalleReceta,
    Diagnostico, Discapacidad, EstadoCondicion, EstadoExpediente, EstadoReceta,
    EventoAuditoria, Expediente, IndicadorMedico, MedicionIndicador, Medicamento,
    MotivoConsulta, NivelSeveridad, OrigenRegistro, Paciente, Permiso, Persona,
    ProfesionalSalud, Receta, RelacionPaciente, Rol, Sexo, SignoVital,
    TipoAntecedente, TipoDiagnostico, TipoRelacion, TipoSangre, UnidadMedida,
    Usuario, ViaAdministracion,
)
from lumora_api.services.medical_record_pdf_service import MedicalRecordPdfService


async def _login(client, username: str) -> str:
    response = await client.post('/api/v1/auth/login', json={'login': username, 'password': 'safe-password'})
    assert response.status_code == 200
    return response.json()['access_token']


async def _setup(client, session_factory, *, with_record: bool = True) -> dict:
    now = datetime(2026, 8, 30, 12, tzinfo=timezone.utc)
    async with session_factory() as session:
        clinical = Permiso(nombre='clinica:manage')
        patient_role = Rol(nombre='Paciente')
        caregiver_role = Rol(nombre='Cuidador')
        staff_role = Rol(nombre='Equipo clínico itinerante', permisos=[clinical])
        other_role = Rol(nombre='Usuario')
        sex = Sexo(nombre='Femenino')
        blood = TipoSangre(nombre='O+')
        record_state = EstadoExpediente(nombre='Activo')
        condition_state = EstadoCondicion(nombre='Activa')
        severity = NivelSeveridad(nombre='Alta')
        history_type = TipoAntecedente(nombre='Familiar')
        reason = MotivoConsulta(nombre='Control')
        diagnosis_type = TipoDiagnostico(nombre='Confirmado')
        prescription_state = EstadoReceta(nombre='Emitida')
        unit = UnidadMedida(nombre='mg/dL')
        route = ViaAdministracion(nombre='Oral')
        origin = OrigenRegistro(nombre='Paciente')
        relationship_type = TipoRelacion(nombre='Familiar')
        session.add_all([patient_role, caregiver_role, staff_role, other_role, sex, blood,
                         record_state, condition_state, severity, history_type, reason,
                         diagnosis_type, prescription_state, unit, route, origin,
                         relationship_type])
        await session.flush()

        patient_person = Persona(nombres='Ana', apellidos='Segura', fecha_nacimiento=now.date(), sexo_id=sex.id)
        other_person = Persona(nombres='Otro', apellidos='Paciente')
        caregiver_person = Persona(nombres='Carmen', apellidos='Cuidadora')
        staff_person = Persona(nombres='Sam', apellidos='Clínico')
        outsider_person = Persona(nombres='Sin', apellidos='Acceso')
        professional_person = Persona(nombres='Dra.', apellidos='Álvarez')
        session.add_all([patient_person, other_person, caregiver_person, staff_person, outsider_person, professional_person])
        await session.flush()
        patient = Paciente(persona_id=patient_person.id, tipo_sangre_id=blood.id)
        other_patient = Paciente(persona_id=other_person.id)
        professional = ProfesionalSalud(persona_id=professional_person.id, especialidad='Medicina familiar', numero_licencia='B15-1')
        users = [
            Usuario(persona_id=patient_person.id, email='patient@example.com', username='patient-b15', password_hash=hash_password('safe-password'), roles=[patient_role]),
            Usuario(persona_id=caregiver_person.id, email='caregiver@example.com', username='caregiver-b15', password_hash=hash_password('safe-password'), roles=[caregiver_role]),
            Usuario(persona_id=staff_person.id, email='staff@example.com', username='staff-b15', password_hash=hash_password('safe-password'), roles=[staff_role]),
            Usuario(persona_id=outsider_person.id, email='outsider@example.com', username='outsider-b15', password_hash=hash_password('safe-password'), roles=[other_role]),
        ]
        session.add_all([patient, other_patient, professional, *users])
        await session.flush()
        relationship = RelacionPaciente(
            paciente_id=patient.id, usuario_relacionado_id=users[1].id,
            tipo_relacion_id=relationship_type.id, estado='active', nivel_acceso='read',
            activo=True, expira_en=now + timedelta(days=10),
        )
        allergy = Alergia(paciente_id=patient.id, nombre='Penicilina', nivel_severidad_id=severity.id, estado_condicion_id=condition_state.id)
        disability = Discapacidad(paciente_id=patient.id, nombre='Movilidad reducida', estado_condicion_id=condition_state.id)
        indicator = IndicadorMedico(id=uuid4(), codigo='GLU-B15', nombre='Glucosa', unidad_medida_id=unit.id)
        session.add_all([relationship, allergy, disability, indicator])
        await session.flush()
        old_measurement = MedicionIndicador(id=uuid4(), paciente_id=patient.id, indicador_id=indicator.id, valor=90, unidad_medida_id=unit.id, origen_registro_id=origin.id, registrado_por_id=users[0].id, fecha_medicion=now - timedelta(days=1))
        measurement = MedicionIndicador(id=uuid4(), paciente_id=patient.id, indicador_id=indicator.id, valor=110, unidad_medida_id=unit.id, origen_registro_id=origin.id, registrado_por_id=users[0].id, fecha_medicion=now)
        session.add_all([old_measurement, measurement])
        record = None
        if with_record:
            record = Expediente(paciente_id=patient.id, estado_expediente_id=record_state.id, numero_expediente='EXP-B15', created_at=now)
            session.add(record)
            await session.flush()
            consultation = ConsultaMedica(expediente_id=record.id, paciente_id=patient.id, profesional_id=professional.id, motivo_consulta_id=reason.id, motivo='Control anual', sintomas='Ninguno', evaluacion='Estable', indicaciones='Continuar', observaciones='Seguimiento', fecha_consulta=now)
            history = AntecedenteMedico(expediente_id=record.id, tipo_antecedente_id=history_type.id, descripcion='Diabetes familiar', fecha=now.date())
            session.add_all([consultation, history])
            await session.flush()
            diagnosis = Diagnostico(consulta_id=consultation.id, expediente_id=record.id, profesional_id=professional.id, tipo_diagnostico_id=diagnosis_type.id, descripcion='Control preventivo', es_principal=True, fecha_diagnostico=now.date())
            vital = SignoVital(consulta_id=consultation.id, glucosa_mg_dl=145, saturacion_oxigeno=98, registrado_at=now)
            condition = CondicionMedica(expediente_id=record.id, paciente_id=patient.id, estado_condicion_id=condition_state.id, nombre='Condición documentada', fecha_inicio=now.date())
            medication = Medicamento(nombre='Metformina', nombre_generico='Metformina', presentacion='Tableta', concentracion='500 mg')
            prescription = Receta(paciente_id=patient.id, profesional_id=professional.id, consulta_id=consultation.id, estado_id=prescription_state.id, titulo='Tratamiento', fecha_emision=now)
            session.add_all([diagnosis, vital, condition, medication, prescription])
            await session.flush()
            session.add(DetalleReceta(receta_id=prescription.id, medicamento_id=medication.id, unidad_medida_id=unit.id, via_administracion_id=route.id, dosis='500 mg', frecuencia='Cada 12 horas', duracion_dias=30, cantidad_total=60, instrucciones='Con alimentos'))
        await session.commit()
        ids = {'patient_id': patient.id, 'other_patient_id': other_patient.id, 'relationship_id': relationship.id, 'patient_user_id': users[0].id, 'caregiver_user_id': users[1].id, 'staff_user_id': users[2].id}
    ids['patient_token'] = await _login(client, 'patient-b15')
    ids['caregiver_token'] = await _login(client, 'caregiver-b15')
    ids['staff_token'] = await _login(client, 'staff-b15')
    ids['outsider_token'] = await _login(client, 'outsider-b15')
    return ids


def _headers(token: str) -> dict[str, str]:
    return {'Authorization': f'Bearer {token}'}


@pytest.mark.asyncio
async def test_json_document_composition_and_idor(client, session_factory):
    data = await _setup(client, session_factory)
    url = f"/api/v1/patients/{data['patient_id']}/medical-record-document"
    assert (await client.get(url)).status_code == 401
    response = await client.get(url, headers=_headers(data['patient_token']))
    assert response.status_code == 200
    body = response.json()
    assert body['paciente'] == {'id': data['patient_id'], 'nombres': 'Ana', 'apellidos': 'Segura', 'fecha_nacimiento': '2026-08-30', 'sexo': {'id': 1, 'nombre': 'Femenino'}, 'tipo_sangre': {'id': 1, 'nombre': 'O+'}}
    assert 'email' not in body['paciente']
    assert 'notas' not in body and 'notas' not in body['consultas'][0]
    assert body['consultas'][0]['signos_vitales'][0]['glucosa_mg_dl'] == 145
    assert body['indicadores'][0]['valor'] == 110
    assert body['recetas'][0]['detalles'][0]['medicamento']['nombre'] == 'Metformina'
    assert body['recetas'][0]['detalles'][0]['via_administracion']['nombre'] == 'Oral'
    assert (await client.get(f"/api/v1/patients/{data['other_patient_id']}/medical-record-document", headers=_headers(data['patient_token']))).status_code == 403
    assert (await client.get(url, headers=_headers(data['outsider_token']))).status_code == 403
    assert (await client.get(url, headers=_headers(data['staff_token']))).status_code == 200
    assert (await client.get('/api/v1/patients/9999/medical-record-document', headers=_headers(data['staff_token']))).status_code == 404


@pytest.mark.asyncio
async def test_caregiver_relationship_lifecycle_and_access_levels(client, session_factory):
    data = await _setup(client, session_factory)
    url = f"/api/v1/patients/{data['patient_id']}/medical-record-document"
    assert (await client.get(url, headers=_headers(data['caregiver_token']))).status_code == 200
    assert (await client.get(f'{url}/pdf', headers=_headers(data['caregiver_token']))).status_code == 200
    async with session_factory() as session:
        relation = await session.get(RelacionPaciente, data['relationship_id'])
        relation.nivel_acceso = 'write'
        await session.commit()
    assert (await client.get(url, headers=_headers(data['caregiver_token']))).status_code == 200
    for field, value in [('estado', 'revoked'), ('estado', 'inactive'), ('estado', 'pending'), ('activo', False)]:
        async with session_factory() as session:
            relation = await session.get(RelacionPaciente, data['relationship_id'])
            relation.estado, relation.activo, relation.expira_en = 'active', True, None
            setattr(relation, field, value)
            await session.commit()
        assert (await client.get(url, headers=_headers(data['caregiver_token']))).status_code == 403
        assert (await client.get(f'{url}/pdf', headers=_headers(data['caregiver_token']))).status_code == 403
    async with session_factory() as session:
        relation = await session.get(RelacionPaciente, data['relationship_id'])
        relation.estado, relation.activo = 'active', True
        relation.expira_en = datetime.now(timezone.utc) - timedelta(days=1)
        await session.commit()
    assert (await client.get(url, headers=_headers(data['caregiver_token']))).status_code == 403
    assert (await client.get(f'{url}/pdf', headers=_headers(data['caregiver_token']))).status_code == 403


@pytest.mark.asyncio
async def test_patient_without_record_keeps_patient_scoped_sections(client, session_factory):
    data = await _setup(client, session_factory, with_record=False)
    response = await client.get(f"/api/v1/patients/{data['patient_id']}/medical-record-document", headers=_headers(data['patient_token']))
    body = response.json()
    assert response.status_code == 200
    assert body['expediente'] is None
    assert body['antecedentes'] == body['condiciones'] == body['consultas'] == []
    assert body['alergias'][0]['nombre'] == 'Penicilina'
    assert body['indicadores'][0]['valor'] == 110


@pytest.mark.asyncio
async def test_pdf_headers_audit_and_render_failure(client, session_factory, monkeypatch):
    data = await _setup(client, session_factory)
    url = f"/api/v1/patients/{data['patient_id']}/medical-record-document/pdf"
    assert (await client.get(url)).status_code == 401
    response = await client.get(url, headers=_headers(data['patient_token']))
    assert response.status_code == 200 and response.content.startswith(b'%PDF-')
    assert response.headers['content-type'] == 'application/pdf'
    assert 'Ana' not in response.headers['content-disposition']
    assert 'no-store' in response.headers['cache-control']
    assert response.headers['x-content-type-options'] == 'nosniff'
    assert (await client.get(url, headers=_headers(data['staff_token']))).status_code == 200
    async with session_factory() as session:
        audit = await session.scalar(select(EventoAuditoria).where(EventoAuditoria.accion == 'EXPORT_PDF'))
        assert (audit.usuario_id, audit.entidad, audit.entidad_id) == (data['patient_user_id'], 'expediente_documental', data['patient_id'])
        assert audit.datos_nuevos is None and audit.datos_anteriores is None
    assert (await client.get(url, headers=_headers(data['outsider_token']))).status_code == 403
    async with session_factory() as session:
        count_before = len(list(await session.scalars(select(EventoAuditoria).where(EventoAuditoria.accion == 'EXPORT_PDF'))))
    def fail(_: MedicalRecordPdfService, __):
        raise RuntimeError('render failed')
    monkeypatch.setattr(MedicalRecordPdfService, 'render', fail)
    with pytest.raises(RuntimeError, match='render failed'):
        await client.get(url, headers=_headers(data['patient_token']))
    async with session_factory() as session:
        count_after = len(list(await session.scalars(select(EventoAuditoria).where(EventoAuditoria.accion == 'EXPORT_PDF'))))
    assert count_after == count_before
