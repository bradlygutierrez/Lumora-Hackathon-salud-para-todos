from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from lumora_api.core.security import hash_password
from lumora_api.models import EventoAuditoria, Paciente, Persona, ProfesionalSalud, Rol, Usuario


async def setup_data(session_factory):
    async with session_factory() as session:
        patient_person = Persona(nombres="P", apellidos="Uno")
        professional_person = Persona(nombres="D", apellidos="Uno")
        user = Usuario(persona=Persona(nombres="A", apellidos="Admin"), email="a@e.com",
                       username="auditor", password_hash=hash_password("safe-password"), roles=[Rol(nombre="Paciente")])
        patient = Paciente(persona=patient_person)
        professional = ProfesionalSalud(persona=professional_person, especialidad="General", numero_licencia="L1")
        session.add_all([user, patient, professional])
        await session.commit()
        return patient.id, professional.id


@pytest.mark.asyncio
async def test_appointment_crud_overlap_filters_and_audit(client, session_factory):
    patient_id, professional_id = await setup_data(session_factory)
    login = await client.post("/api/v1/auth/login", json={"login": "auditor", "password": "safe-password"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}", "User-Agent": "pytest-agent"}
    start = datetime.now(timezone.utc) + timedelta(days=1)
    payload = {"paciente_id": patient_id, "profesional_id": professional_id,
               "inicio": start.isoformat(), "fin": (start + timedelta(hours=1)).isoformat(), "notas": "Control"}
    created = await client.post("/api/v1/citas", json=payload, headers=headers)
    assert created.status_code == 201
    appointment_id = created.json()["id"]
    assert (await client.post("/api/v1/citas", json=payload, headers=headers)).status_code == 409
    listed = await client.get(f"/api/v1/citas?paciente_id={patient_id}", headers=headers)
    assert [item["id"] for item in listed.json()] == [appointment_id]
    assert (await client.patch(f"/api/v1/citas/{appointment_id}", json={"notas": "Actualizada"}, headers=headers)).status_code == 200
    assert (await client.delete(f"/api/v1/citas/{appointment_id}", headers=headers)).status_code == 204
    async with session_factory() as session:
        events = list(await session.scalars(select(EventoAuditoria).order_by(EventoAuditoria.id)))
        assert [event.accion for event in events] == ["CREATE", "UPDATE", "DELETE"]
        assert events[0].usuario_id and events[0].ip and events[0].user_agent == "pytest-agent"
        assert events[1].datos_anteriores["notas"] == "Control"
        assert events[1].datos_nuevos["notas"] == "Actualizada"


@pytest.mark.asyncio
async def test_appointment_period_validation(client, session_factory):
    patient_id, professional_id = await setup_data(session_factory)
    login = await client.post("/api/v1/auth/login", json={"login": "auditor", "password": "safe-password"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    start = datetime.now(timezone.utc) + timedelta(days=1)
    response = await client.post("/api/v1/citas", json={"paciente_id": patient_id, "profesional_id": professional_id,
        "inicio": start.isoformat(), "fin": (start + timedelta(hours=13)).isoformat()}, headers=headers)
    assert response.status_code == 422
