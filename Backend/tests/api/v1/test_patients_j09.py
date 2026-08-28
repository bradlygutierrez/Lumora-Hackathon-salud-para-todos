from datetime import date

import pytest
from sqlalchemy import func, select

from lumora_api.core.security import create_access_token, hash_password
from lumora_api.models import (
    Paciente,
    Permiso,
    Persona,
    RelacionPaciente,
    Rol,
    Sexo,
    TipoRelacion,
    TipoSangre,
    Usuario,
)


def auth_headers(user_id: int) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user_id)}"}


async def create_actor(session_factory, *, username: str, clinical: bool = False) -> int:
    async with session_factory() as session:
        permissions = [Permiso(nombre="clinica:manage")] if clinical else []
        role = Rol(nombre="Profesional" if clinical else "Paciente", permisos=permissions)
        user = Usuario(
            persona=Persona(nombres="Actor", apellidos=username),
            email=f"{username}@example.com",
            username=username,
            password_hash=hash_password("safe-password"),
            roles=[role],
        )
        session.add(user)
        await session.commit()
        return user.id


async def create_catalogs(session_factory) -> tuple[int, int]:
    async with session_factory() as session:
        sex = Sexo(nombre="Femenino")
        blood = TipoSangre(nombre="O+")
        session.add_all([sex, blood])
        await session.commit()
        return sex.id, blood.id


def registration_payload(sex_id: int, blood_id: int, *, names: str = "María", phone: str = "8888-1111"):
    return {
        "persona": {
            "nombres": names,
            "apellidos": "Gómez",
            "email": f"{names.lower().replace('í', 'i')}@example.com",
            "fecha_nacimiento": "1994-05-18",
            "telefono": phone,
            "sexo_id": sex_id,
            "direccion": {
                "linea_1": "Residencial Las Flores #12",
                "ciudad": "Managua",
                "departamento": "Managua",
                "pais": "Nicaragua",
                "es_principal": True,
            },
        },
        "tipo_sangre_id": blood_id,
        "contacto_emergencia": {
            "nombre": "Carlos Gómez",
            "parentesco": "Padre/Madre",
            "telefono": "8888-2222",
        },
    }


@pytest.mark.asyncio
async def test_staff_registration_requires_clinical_permission(client, session_factory):
    sex_id, blood_id = await create_catalogs(session_factory)
    payload = registration_payload(sex_id, blood_id)

    assert (await client.post("/api/v1/pacientes/registro-clinico", json=payload)).status_code == 401

    patient_user = await create_actor(session_factory, username="patient-j09")
    forbidden = await client.post(
        "/api/v1/pacientes/registro-clinico",
        headers=auth_headers(patient_user),
        json=payload,
    )
    assert forbidden.status_code == 403


@pytest.mark.asyncio
async def test_staff_registration_is_atomic_and_does_not_create_user(client, session_factory):
    sex_id, blood_id = await create_catalogs(session_factory)
    clinician = await create_actor(session_factory, username="clinician-j09", clinical=True)

    response = await client.post(
        "/api/v1/pacientes/registro-clinico",
        headers=auth_headers(clinician),
        json=registration_payload(sex_id, blood_id),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["persona"]["nombres"] == "María"
    assert body["persona"]["email"] == "maria@example.com"
    assert body["persona"]["direcciones"][0]["ciudad"] == "Managua"
    assert body["contactos_emergencia"][0]["nombre"] == "Carlos Gómez"

    async with session_factory() as session:
        person = await session.scalar(select(Persona).where(Persona.id == body["persona"]["id"]))
        assert person is not None
        users = await session.scalar(select(func.count()).select_from(Usuario).where(Usuario.persona_id == person.id))
        assert users == 0


@pytest.mark.asyncio
async def test_patient_list_supports_search_filters_and_pagination(client, session_factory):
    sex_id, blood_id = await create_catalogs(session_factory)
    clinician = await create_actor(session_factory, username="search-clinician", clinical=True)
    headers = auth_headers(clinician)

    first = await client.post(
        "/api/v1/pacientes/registro-clinico",
        headers=headers,
        json=registration_payload(sex_id, blood_id, names="María", phone="8888-1111"),
    )
    assert first.status_code == 201
    second_payload = registration_payload(sex_id, blood_id, names="Elena", phone="7777-9999")
    second_payload["persona"]["email"] = "elena@example.com"
    assert (await client.post("/api/v1/pacientes/registro-clinico", headers=headers, json=second_payload)).status_code == 201

    by_name = await client.get("/api/v1/pacientes", headers=headers, params={"search": "maria"})
    assert by_name.status_code == 200
    assert by_name.json()["total"] == 1
    assert by_name.json()["items"][0]["persona"]["nombres"] == "María"

    by_phone = await client.get("/api/v1/pacientes", headers=headers, params={"search": "7777"})
    assert by_phone.json()["total"] == 1
    assert by_phone.json()["items"][0]["persona"]["nombres"] == "Elena"

    filtered = await client.get(
        "/api/v1/pacientes",
        headers=headers,
        params={"sexo_id": sex_id, "tipo_sangre_id": blood_id, "limit": 1, "offset": 1},
    )
    assert filtered.status_code == 200
    assert filtered.json()["total"] == 2
    assert filtered.json()["limit"] == 1
    assert filtered.json()["offset"] == 1
    assert len(filtered.json()["items"]) == 1


@pytest.mark.asyncio
async def test_patient_detail_includes_emergency_contact(client, session_factory):
    sex_id, blood_id = await create_catalogs(session_factory)
    clinician = await create_actor(session_factory, username="detail-clinician", clinical=True)
    headers = auth_headers(clinician)
    created = await client.post(
        "/api/v1/pacientes/registro-clinico",
        headers=headers,
        json=registration_payload(sex_id, blood_id),
    )
    patient_id = created.json()["id"]

    detail = await client.get(f"/api/v1/pacientes/{patient_id}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["persona"]["email"] == "maria@example.com"
    assert detail.json()["contactos_emergencia"][0]["parentesco"] == "Padre/Madre"


@pytest.mark.asyncio
async def test_family_view_is_authorized_and_returns_resolved_relationship(client, session_factory):
    sex_id, blood_id = await create_catalogs(session_factory)
    clinician = await create_actor(session_factory, username="family-clinician", clinical=True)
    headers = auth_headers(clinician)
    created = await client.post(
        "/api/v1/pacientes/registro-clinico",
        headers=headers,
        json=registration_payload(sex_id, blood_id),
    )
    patient_id = created.json()["id"]

    async with session_factory() as session:
        related = Usuario(
            persona=Persona(nombres="Eleanor", apellidos="Vance"),
            email="eleanor@example.com",
            username="eleanor-j09",
            password_hash=hash_password("safe-password"),
            roles=[Rol(nombre="Cuidador")],
        )
        relationship_type = TipoRelacion(nombre="Cónyuge")
        session.add_all([related, relationship_type])
        await session.flush()
        session.add(
            RelacionPaciente(
                paciente_id=patient_id,
                usuario_relacionado_id=related.id,
                tipo_relacion_id=relationship_type.id,
                recibir_notificaciones=True,
                activo=True,
                estado="active",
                nivel_acceso="read",
            )
        )
        await session.commit()

    response = await client.get(f"/api/v1/pacientes/{patient_id}/familiares", headers=headers)
    assert response.status_code == 200
    assert response.json() == [
        {
            "id": response.json()[0]["id"],
            "usuario_relacionado_id": response.json()[0]["usuario_relacionado_id"],
            "nombres": "Eleanor",
            "apellidos": "Vance",
            "tipo_relacion_id": response.json()[0]["tipo_relacion_id"],
            "tipo_relacion": "Cónyuge",
            "recibir_notificaciones": True,
            "estado": "active",
            "nivel_acceso": "read",
            "expira_en": None,
        }
    ]

    anonymous = await client.get(f"/api/v1/pacientes/{patient_id}/familiares")
    assert anonymous.status_code == 401


@pytest.mark.asyncio
async def test_emergency_contacts_are_scoped_to_authorized_patient_access(client, session_factory):
    sex_id, blood_id = await create_catalogs(session_factory)
    clinician = await create_actor(session_factory, username="contact-clinician", clinical=True)
    headers = auth_headers(clinician)
    created = await client.post(
        "/api/v1/pacientes/registro-clinico",
        headers=headers,
        json=registration_payload(sex_id, blood_id),
    )
    patient_id = created.json()["id"]
    contact_id = created.json()["contactos_emergencia"][0]["id"]

    assert (
        await client.get(f"/api/v1/pacientes/{patient_id}/contactos-emergencia")
    ).status_code == 401

    unrelated = await create_actor(session_factory, username="unrelated-patient")
    hidden = await client.get(
        f"/api/v1/pacientes/{patient_id}/contactos-emergencia",
        headers=auth_headers(unrelated),
    )
    assert hidden.status_code == 404

    updated = await client.patch(
        f"/api/v1/pacientes/{patient_id}/contactos-emergencia/{contact_id}",
        headers=headers,
        json={"telefono": "7777-3333"},
    )
    assert updated.status_code == 200
    assert updated.json()["telefono"] == "7777-3333"


@pytest.mark.asyncio
async def test_legacy_relationship_list_is_not_public(client, session_factory):
    sex_id, blood_id = await create_catalogs(session_factory)
    clinician = await create_actor(session_factory, username="legacy-family-clinician", clinical=True)
    created = await client.post(
        "/api/v1/pacientes/registro-clinico",
        headers=auth_headers(clinician),
        json=registration_payload(sex_id, blood_id),
    )
    patient_id = created.json()["id"]

    anonymous = await client.get(f"/api/v1/reminders/pacientes/{patient_id}/relaciones")
    assert anonymous.status_code == 401

    allowed = await client.get(
        f"/api/v1/reminders/pacientes/{patient_id}/relaciones",
        headers=auth_headers(clinician),
    )
    assert allowed.status_code == 200


@pytest.mark.asyncio
async def test_patient_me_resolves_profile_with_patient_repository(client, session_factory):
    async with session_factory() as session:
        person = Persona(nombres="Mi", apellidos="Paciente")
        patient = Paciente(persona=person)
        user = Usuario(
            persona=person,
            email="patient-me-j09@example.com",
            username="patient-me-j09",
            password_hash=hash_password("safe-password"),
            roles=[Rol(nombre="Paciente")],
        )
        session.add_all([patient, user])
        await session.commit()
        user_id = user.id
        patient_id = patient.id

    response = await client.get("/api/v1/pacientes/me", headers=auth_headers(user_id))

    assert response.status_code == 200
    assert response.json()["id"] == patient_id
