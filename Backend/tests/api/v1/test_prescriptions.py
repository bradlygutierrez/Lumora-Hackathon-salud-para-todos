import pytest
from httpx import AsyncClient

from lumora_api.core.security import hash_password
from lumora_api.models import Paciente, Permiso, Persona, ProfesionalSalud, Rol, Usuario


async def _staff_login(client: AsyncClient, session_factory) -> str:
    async with session_factory() as session:
        role = Rol(nombre="Staff", permisos=[Permiso(nombre="clinica:manage")])
        session.add(
            Usuario(
                persona=Persona(nombres="Doc", apellidos="Staff"),
                email="doc1@example.com",
                username="doc1",
                password_hash=hash_password("safe-password"),
                roles=[role],
            )
        )
        await session.commit()
    login = await client.post(
        "/api/v1/auth/login", json={"login": "doc1", "password": "safe-password"}
    )
    assert login.status_code == 200
    return login.json()["access_token"]


@pytest.mark.asyncio
async def test_create_prescription_validation_error(client: AsyncClient, session_factory):
    # Ahora requiere estar logueado como staff -- se prueba la validación
    # de datos (duracion_dias/cantidad_total <= 0), no la autenticación.
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
                "duracion_dias": 0,  # Inválido por la regla gt=0
                "cantidad_total": -5  # Inválido por la regla gt=0
            }
        ]
    }
    response = await client.post("/api/v1/prescriptions", json=payload, headers=headers)
    assert response.status_code == 422  # HTTP 422 Unprocessable Entity


@pytest.mark.asyncio
async def test_prescriptions_require_authentication(client: AsyncClient):
    # Antes de este cambio, este endpoint respondía sin pedir token.
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
async def test_staff_can_create_receta_with_titulo_and_profesional(
    client: AsyncClient, session_factory
):
    async with session_factory() as session:
        patient_person = Persona(nombres="Pac", apellidos="Uno")
        session.add(patient_person)
        await session.flush()
        patient = Paciente(persona_id=patient_person.id)
        professional = ProfesionalSalud(
            persona=Persona(nombres="Emilio", apellidos="Cárdenas"),
            especialidad="Cardiología",
            numero_licencia="L-100",
        )
        session.add_all([patient, professional])
        await session.commit()
        patient_id, professional_id = patient.id, professional.id

    token = await _staff_login(client, session_factory)
    headers = {"Authorization": f"Bearer {token}"}

    medication = await client.post(
        "/api/v1/prescriptions/medications", json={"nombre": "Losartán"}, headers=headers
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
    assert body["profesional"]["especialidad"] == "Cardiología"
    assert body["profesional"]["persona"]["nombres"] == "Emilio"

