from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from helpers.medical import create_active_medical_professional
from lumora_api.core.security import hash_password
from lumora_api.models import (
    Cita,
    ConsultaMedica,
    EstadoExpediente,
    Expediente,
    Paciente,
    Permiso,
    Persona,
    ProfesionalSalud,
    Receta,
    Rol,
    Usuario,
)


async def _staff_login(client: AsyncClient, session_factory) -> str:
    async with session_factory() as session:
        user = Usuario(
            persona=Persona(nombres="Doc", apellidos="Staff"),
            email="doc1@example.com",
            username="doc1",
            password_hash=hash_password("safe-password"),
        )
        session.add(user)
        await session.flush()
        await create_active_medical_professional(session, user=user, username="doc1")
        await session.commit()
    login = await client.post(
        "/api/v1/auth/login", json={"login": "doc1", "password": "safe-password"}
    )
    assert login.status_code == 200
    return login.json()["access_token"]


async def _staff_login_with_professional(
    client: AsyncClient,
    session_factory,
    *,
    username: str,
    email: str,
    nombres: str = "Doc",
    apellidos: str = "Profesional",
    especialidad: str = "Medicina general",
    numero_licencia: str,
) -> tuple[str, int]:
    async with session_factory() as session:
        permission = await session.scalar(
            select(Permiso).where(Permiso.nombre == "clinica:manage")
        )
        if permission is None:
            permission = Permiso(nombre="clinica:manage")
            session.add(permission)
            await session.flush()
        role = Rol(nombre=f"Staff-{username}", permisos=[permission])
        person = Persona(nombres=nombres, apellidos=apellidos)
        user = Usuario(
            persona=person,
            email=email,
            username=username,
            password_hash=hash_password("safe-password"),
            roles=[role],
        )
        professional = ProfesionalSalud(
            persona=person,
            especialidad=especialidad,
            numero_licencia=numero_licencia,
        )
        session.add_all([user, professional])
        await session.flush()
        await create_active_medical_professional(session, user=user, professional=professional, username=username)
        professional_id = professional.id
        await session.commit()

    login = await client.post(
        "/api/v1/auth/login",
        json={"login": username, "password": "safe-password"},
    )
    assert login.status_code == 200
    return login.json()["access_token"], professional_id


async def _create_patient(session_factory, suffix: str) -> int:
    async with session_factory() as session:
        person = Persona(nombres="Paciente", apellidos=suffix)
        session.add(person)
        await session.flush()
        patient = Paciente(persona_id=person.id)
        session.add(patient)
        await session.flush()
        patient_id = patient.id
        await session.commit()
        return patient_id


async def _create_consultation(
    session_factory,
    *,
    patient_id: int,
    professional_id: int,
    suffix: str,
) -> int:
    async with session_factory() as session:
        state = await session.scalar(
            select(EstadoExpediente).where(EstadoExpediente.nombre == "Activo")
        )
        if state is None:
            state = EstadoExpediente(nombre="Activo")
            session.add(state)
            await session.flush()
        record = Expediente(
            paciente_id=patient_id,
            estado_expediente_id=state.id,
            numero_expediente=f"RX-{suffix}",
        )
        session.add(record)
        await session.flush()
        consultation = ConsultaMedica(
            expediente_id=record.id,
            paciente_id=patient_id,
            profesional_id=professional_id,
            motivo="Control para receta",
        )
        session.add(consultation)
        await session.flush()
        consultation_id = consultation.id
        await session.commit()
        return consultation_id


async def _create_appointment(
    session_factory, *, patient_id: int, professional_id: int
) -> int:
    """Vínculo profesional-paciente más liviano que _create_consultation
    (sin expediente, que es único por paciente): alcanza para que
    ProfessionalWorkspaceRepository.related_patient_ids reconozca la
    relación cuando un test ya tiene un expediente para ese paciente."""
    async with session_factory() as session:
        now = datetime.now(timezone.utc)
        appointment = Cita(
            paciente_id=patient_id,
            profesional_id=professional_id,
            inicio=now,
            fin=now + timedelta(minutes=30),
        )
        session.add(appointment)
        await session.flush()
        appointment_id = appointment.id
        await session.commit()
        return appointment_id


@pytest.mark.asyncio
async def test_create_prescription_validation_error(client: AsyncClient, session_factory):
    # Pydantic debe rechazar duración/cantidad inválidas antes de persistir.
    token = await _staff_login(client, session_factory)
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "paciente_id": 1,
        "profesional_id": 1,
        "consulta_id": None,
        "estado_id": 1,
        "observaciones": "Prueba error",
        "detalles": [
            {
                "medicamento_id": "35f4a5f3-e2ff-475e-93db-86f5c2c001a6",
                "via_administracion_id": 1,
                "unidad_medida_id": 1,
                "dosis": "500mg",
                "frecuencia": "Cada 8 horas",
                "duracion_dias": 0,
                "cantidad_total": -5,
            }
        ],
    }
    response = await client.post("/api/v1/prescriptions", json=payload, headers=headers)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_prescriptions_require_authentication(client: AsyncClient):
    response = await client.get("/api/v1/prescriptions/patient/1")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_patient_cannot_create_receta(client: AsyncClient, session_factory):
    async with session_factory() as session:
        session.add(
            Usuario(
                persona=Persona(nombres="Pac", apellidos="Simple"),
                email="pac1@example.com",
                username="pac1",
                password_hash=hash_password("safe-password"),
                roles=[Rol(nombre="Paciente")],
            )
        )
        await session.commit()
    login = await client.post(
        "/api/v1/auth/login", json={"login": "pac1", "password": "safe-password"}
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    response = await client.post(
        "/api/v1/prescriptions",
        json={"paciente_id": 1, "profesional_id": 1, "detalles": []},
        headers=headers,
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_staff_can_create_receta_only_with_own_professional_profile(
    client: AsyncClient, session_factory
):
    patient_id = await _create_patient(session_factory, "Uno")
    token, professional_id = await _staff_login_with_professional(
        client,
        session_factory,
        username="doc-own",
        email="doc-own@example.com",
        nombres="Emilio",
        apellidos="Cárdenas",
        especialidad="Cardiología",
        numero_licencia="L-100",
    )
    await _create_consultation(
        session_factory,
        patient_id=patient_id,
        professional_id=professional_id,
        suffix="OWN-PROFILE",
    )
    headers = {"Authorization": f"Bearer {token}"}

    medication = await client.post(
        "/api/v1/prescriptions/medications",
        json={"nombre": "Losartán"},
        headers=headers,
    )
    assert medication.status_code == 201

    payload = {
        "paciente_id": patient_id,
        "profesional_id": professional_id,
        "titulo": "Tratamiento Hipertensión",
        "detalles": [
            {
                "medicamento_id": medication.json()["id"],
                "unidad_medida_id": 1,
                "via_administracion_id": 1,
                "dosis": "50mg",
                "frecuencia": "Cada 12 horas",
                "duracion_dias": 30,
                "cantidad_total": 60,
            }
        ],
    }
    created = await client.post("/api/v1/prescriptions", json=payload, headers=headers)
    assert created.status_code == 201
    body = created.json()
    assert body["titulo"] == "Tratamiento Hipertensión"
    assert body["profesional_id"] == professional_id
    assert body["profesional"]["especialidad"] == "Cardiología"
    assert body["profesional"]["persona"]["nombres"] == "Emilio"


@pytest.mark.asyncio
async def test_staff_cannot_prescribe_to_a_patient_with_no_relationship(
    client: AsyncClient, session_factory
):
    # Regresión: un profesional con clinica:manage podía emitir recetas a
    # cualquier paciente del sistema, aunque nunca hubiera tenido una cita
    # o consulta con él/ella.
    patient_id = await _create_patient(session_factory, "SinRelacion")
    token, professional_id = await _staff_login_with_professional(
        client,
        session_factory,
        username="doc-sin-relacion",
        email="doc-sin-relacion@example.com",
        numero_licencia="L-SIN-RELACION",
    )

    response = await client.post(
        "/api/v1/prescriptions",
        json={
            "paciente_id": patient_id,
            "profesional_id": professional_id,
            "detalles": [],
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"


@pytest.mark.asyncio
async def test_staff_cannot_issue_recipe_as_another_professional(
    client: AsyncClient, session_factory
):
    patient_id = await _create_patient(session_factory, "Dos")
    token, own_professional_id = await _staff_login_with_professional(
        client,
        session_factory,
        username="doc-owner",
        email="doc-owner@example.com",
        numero_licencia="L-OWNER",
    )
    await _create_consultation(
        session_factory,
        patient_id=patient_id,
        professional_id=own_professional_id,
        suffix="IMPERSONATION",
    )
    async with session_factory() as session:
        other = ProfesionalSalud(
            persona=Persona(nombres="Otro", apellidos="Profesional"),
            especialidad="Neurología",
            numero_licencia="L-OTHER",
        )
        session.add(other)
        await session.flush()
        other_professional_id = other.id
        await session.commit()

    assert own_professional_id != other_professional_id
    response = await client.post(
        "/api/v1/prescriptions",
        json={
            "paciente_id": patient_id,
            "profesional_id": other_professional_id,
            "detalles": [],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"


@pytest.mark.asyncio
async def test_recipe_rejects_consultation_from_another_patient(
    client: AsyncClient, session_factory
):
    patient_a = await _create_patient(session_factory, "Consulta-A")
    patient_b = await _create_patient(session_factory, "Consulta-B")
    token, professional_id = await _staff_login_with_professional(
        client,
        session_factory,
        username="doc-consulta",
        email="doc-consulta@example.com",
        numero_licencia="L-CONSULTA",
    )
    consultation_id = await _create_consultation(
        session_factory,
        patient_id=patient_a,
        professional_id=professional_id,
        suffix="PATIENT-MISMATCH-A",
    )
    # patient_b also has a real relationship with the professional, so the
    # 409 being tested (wrong patient for that specific consultation) isn't
    # masked by the newer "patient not assigned to this professional" 403.
    await _create_appointment(
        session_factory, patient_id=patient_b, professional_id=professional_id
    )

    response = await client.post(
        "/api/v1/prescriptions",
        json={
            "paciente_id": patient_b,
            "profesional_id": professional_id,
            "consulta_id": consultation_id,
            "detalles": [],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "conflict"


@pytest.mark.asyncio
async def test_recipe_rejects_consultation_from_another_professional(
    client: AsyncClient, session_factory
):
    patient_id = await _create_patient(session_factory, "Consulta-Profesional")
    token, professional_id = await _staff_login_with_professional(
        client,
        session_factory,
        username="doc-consulta-owner",
        email="doc-consulta-owner@example.com",
        numero_licencia="L-CONSULTA-OWNER",
    )
    _, other_professional_id = await _staff_login_with_professional(
        client,
        session_factory,
        username="doc-consulta-other",
        email="doc-consulta-other@example.com",
        numero_licencia="L-CONSULTA-OTHER",
    )
    consultation_id = await _create_consultation(
        session_factory,
        patient_id=patient_id,
        professional_id=other_professional_id,
        suffix="PROFESSIONAL-MISMATCH",
    )
    # The acting professional also has a real (separate) relationship with
    # the patient, so the 403 being tested (consultation owned by someone
    # else) isn't masked by the newer "patient not assigned" 403.
    await _create_appointment(
        session_factory, patient_id=patient_id, professional_id=professional_id
    )

    response = await client.post(
        "/api/v1/prescriptions",
        json={
            "paciente_id": patient_id,
            "profesional_id": professional_id,
            "consulta_id": consultation_id,
            "detalles": [],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"


@pytest.mark.asyncio
async def test_other_professional_cannot_edit_recipe_or_its_details(
    client: AsyncClient, session_factory
):
    patient_id = await _create_patient(session_factory, "Propiedad")
    owner_token, owner_professional_id = await _staff_login_with_professional(
        client,
        session_factory,
        username="doc-rx-owner",
        email="doc-rx-owner@example.com",
        numero_licencia="L-RX-OWNER",
    )
    other_token, _ = await _staff_login_with_professional(
        client,
        session_factory,
        username="doc-rx-other",
        email="doc-rx-other@example.com",
        numero_licencia="L-RX-OTHER",
    )
    await _create_consultation(
        session_factory,
        patient_id=patient_id,
        professional_id=owner_professional_id,
        suffix="OWNERSHIP",
    )
    owner_headers = {"Authorization": f"Bearer {owner_token}"}
    other_headers = {"Authorization": f"Bearer {other_token}"}

    medication = await client.post(
        "/api/v1/prescriptions/medications",
        json={"nombre": "Amlodipino"},
        headers=owner_headers,
    )
    assert medication.status_code == 201
    created = await client.post(
        "/api/v1/prescriptions",
        json={
            "paciente_id": patient_id,
            "profesional_id": owner_professional_id,
            "titulo": "Receta protegida",
            "detalles": [
                {
                    "medicamento_id": medication.json()["id"],
                    "unidad_medida_id": 1,
                    "via_administracion_id": 1,
                    "dosis": "5mg",
                    "frecuencia": "Cada 24 horas",
                    "duracion_dias": 10,
                    "cantidad_total": 10,
                }
            ],
        },
        headers=owner_headers,
    )
    assert created.status_code == 201
    recipe_id = created.json()["id"]
    detail_id = created.json()["detalles"][0]["id"]

    update = await client.patch(
        f"/api/v1/prescriptions/{recipe_id}",
        json={"titulo": "Intento de suplantación"},
        headers=other_headers,
    )
    assert update.status_code == 403

    detail_update = await client.patch(
        f"/api/v1/prescriptions/{recipe_id}/detalles/{detail_id}",
        json={"dosis": "20mg"},
        headers=other_headers,
    )
    assert detail_update.status_code == 403

    detail_delete = await client.delete(
        f"/api/v1/prescriptions/{recipe_id}/detalles/{detail_id}",
        headers=other_headers,
    )
    assert detail_delete.status_code == 403


@pytest.mark.asyncio
async def test_staff_cannot_edit_recipe_after_losing_the_patient_relationship(
    client: AsyncClient, session_factory
):
    # Regresión: _owned_recipe solo validaba la propiedad de la receta,
    # nunca revalidaba que la relación con el paciente siguiera vigente.
    patient_id = await _create_patient(session_factory, "Revocado")
    token, professional_id = await _staff_login_with_professional(
        client,
        session_factory,
        username="doc-rx-revoked",
        email="doc-rx-revoked@example.com",
        numero_licencia="L-RX-REVOKED",
    )
    consultation_id = await _create_consultation(
        session_factory,
        patient_id=patient_id,
        professional_id=professional_id,
        suffix="REVOKED",
    )
    headers = {"Authorization": f"Bearer {token}"}

    created = await client.post(
        "/api/v1/prescriptions",
        json={
            "paciente_id": patient_id,
            "profesional_id": professional_id,
            "consulta_id": consultation_id,
            "titulo": "Receta a revocar",
            "detalles": [],
        },
        headers=headers,
    )
    assert created.status_code == 201
    recipe_id = created.json()["id"]

    # La única consulta que establecía la relación se borra lógicamente.
    async with session_factory() as session:
        consultation = await session.get(ConsultaMedica, consultation_id)
        consultation.deleted_at = datetime.now(timezone.utc)
        await session.commit()

    update = await client.patch(
        f"/api/v1/prescriptions/{recipe_id}",
        json={"titulo": "Ya no debería poder editarla"},
        headers=headers,
    )
    assert update.status_code == 403
    assert update.json()["error"]["code"] == "forbidden"


@pytest.mark.asyncio
async def test_staff_cannot_edit_recipe_past_the_editable_window(
    client: AsyncClient, session_factory
):
    patient_id = await _create_patient(session_factory, "Vencida")
    token, professional_id = await _staff_login_with_professional(
        client,
        session_factory,
        username="doc-rx-stale",
        email="doc-rx-stale@example.com",
        numero_licencia="L-RX-STALE",
    )
    await _create_consultation(
        session_factory,
        patient_id=patient_id,
        professional_id=professional_id,
        suffix="STALE",
    )
    headers = {"Authorization": f"Bearer {token}"}

    created = await client.post(
        "/api/v1/prescriptions",
        json={
            "paciente_id": patient_id,
            "profesional_id": professional_id,
            "titulo": "Receta vieja",
            "detalles": [],
        },
        headers=headers,
    )
    assert created.status_code == 201
    recipe_id = created.json()["id"]

    async with session_factory() as session:
        receta = await session.get(Receta, recipe_id)
        receta.fecha_emision = datetime.utcnow() - timedelta(hours=49)
        await session.commit()

    update = await client.patch(
        f"/api/v1/prescriptions/{recipe_id}",
        json={"titulo": "Ya no debería ser editable"},
        headers=headers,
    )
    assert update.status_code == 409
    assert update.json()["error"]["code"] == "conflict"
