import pytest
from sqlalchemy import select

from lumora_api.core.security import verify_password
from lumora_api.core.security import create_access_token
from lumora_api.models import ContactoEmergencia, Permiso, Rol, Usuario


async def create_user(client, session_factory, *, email="ana@example.com", username="ana"):
    async with session_factory() as session:
        role = await session.scalar(select(Rol).where(Rol.nombre == "Paciente"))
        if role is None:
            role = Rol(nombre="Paciente")
            session.add(role)
            await session.commit()
        role_id = role.id
    return await client.post(
        "/api/v1/usuarios",
        json={
            "email": email,
            "username": username,
            "password": "safe-password",
            "rol_id": role_id,
            "persona": {
                "nombres": "Ana",
                "apellidos": "López",
                "direcciones": [
                    {"linea_1": "Calle Central", "ciudad": "Managua", "es_principal": True}
                ],
            },
        },
    )


async def grant_permissions(session_factory, user_id: int, *permission_names: str):
    async with session_factory() as session:
        user = await session.get(Usuario, user_id)
        role = Rol(nombre=f"J08-{user_id}-{'-'.join(permission_names)}")
        role.permisos = [Permiso(nombre=name) for name in permission_names]
        user.roles.append(role)
        session.add(role)
        await session.commit()


def auth_headers(user_id: int) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user_id)}"}


@pytest.mark.asyncio
async def test_user_password_is_private_and_email_username_are_unique(client, session_factory):
    created = await create_user(client, session_factory)
    assert created.status_code == 201
    payload = created.json()
    assert "password" not in payload
    assert "password_hash" not in payload
    assert payload["persona"]["direcciones"][0]["ciudad"] == "Managua"

    async with session_factory() as session:
        user = await session.get(Usuario, payload["id"])
        assert verify_password("safe-password", user.password_hash)

    duplicate_email = await create_user(
        client, session_factory, email="ana@example.com", username="ana2"
    )
    duplicate_username = await create_user(
        client, session_factory, email="ana2@example.com", username="ana"
    )
    assert duplicate_email.status_code == duplicate_username.status_code == 409

    user_id = payload["id"]
    updated = await client.patch(
        f"/api/v1/usuarios/{user_id}",
        json={"username": "ana.actualizada", "password": "new-safe-password"},
    )
    assert updated.status_code == 200
    assert updated.json()["username"] == "ana.actualizada"
    assert (await client.get("/api/v1/usuarios")).json()["total"] == 1
    assert (await client.get(f"/api/v1/usuarios/{user_id}")).status_code == 200
    assert (await client.delete(f"/api/v1/usuarios/{user_id}")).status_code == 204
    assert (await client.get(f"/api/v1/usuarios/{user_id}")).status_code == 404


@pytest.mark.asyncio
async def test_profiles_contacts_and_soft_delete_preserve_rows(client, session_factory):
    user = (await create_user(client, session_factory)).json()
    person_id = user["persona"]["id"]

    patient = await client.post("/api/v1/pacientes", json={"persona_id": person_id})
    assert patient.status_code == 201
    patient_id = patient.json()["id"]
    duplicate = await client.post("/api/v1/pacientes", json={"persona_id": person_id})
    assert duplicate.status_code == 409
    updated_patient = await client.patch(
        f"/api/v1/pacientes/{patient_id}",
        json={"alergias": "Penicilina", "persona": {"telefono": "2222-2222"}},
    )
    assert updated_patient.json()["alergias"] == "Penicilina"
    assert updated_patient.json()["persona"]["telefono"] == "2222-2222"

    contact = await client.post(
        f"/api/v1/pacientes/{patient_id}/contactos-emergencia",
        json={"nombre": "Carlos", "parentesco": "Padre", "telefono": "8888-8888"},
    )
    assert contact.status_code == 201
    contact_id = contact.json()["id"]
    assert (await client.get(f"/api/v1/pacientes/{patient_id}/contactos-emergencia")).json()["total"] == 1
    assert (
        await client.patch(
            f"/api/v1/pacientes/{patient_id}/contactos-emergencia/{contact_id}",
            json={"telefono": "7777-7777"},
        )
    ).json()["telefono"] == "7777-7777"
    assert (
        await client.delete(
            f"/api/v1/pacientes/{patient_id}/contactos-emergencia/{contact_id}"
        )
    ).status_code == 204

    assert (await client.delete(f"/api/v1/pacientes/{patient_id}")).status_code == 204
    user_id = user["id"]
    headers = {"Authorization": f"Bearer {create_access_token(user_id)}"}
    assert (await client.get(f"/api/v1/pacientes/{patient_id}", headers=headers)).status_code == 404
    async with session_factory() as session:
        assert await session.get(ContactoEmergencia, contact_id) is not None


@pytest.mark.asyncio
async def test_professional_profile_requires_existing_person(client, session_factory):
    manager = (
        await create_user(
            client,
            session_factory,
            email="manager-existing@example.com",
            username="manager-existing",
        )
    ).json()
    await grant_permissions(
        session_factory, manager["id"], "clinica:manage", "usuarios:editar"
    )
    headers = auth_headers(manager["id"])

    missing = await client.post(
        "/api/v1/profesionales",
        headers=headers,
        json={
            "persona_id": 999,
            "especialidad": "Cardiología",
            "numero_licencia": "MED-1",
        },
    )
    assert missing.status_code == 404

    user = (await create_user(client, session_factory)).json()
    created = await client.post(
        "/api/v1/profesionales",
        headers=headers,
        json={
            "persona_id": user["persona"]["id"],
            "especialidad": "Cardiología",
            "numero_licencia": "MED-1",
        },
    )
    assert created.status_code == 201
    assert "deleted_at" not in created.json()
    professional_id = created.json()["id"]
    updated = await client.patch(
        f"/api/v1/profesionales/{professional_id}",
        headers=headers,
        json={"especialidad": "Medicina interna"},
    )
    assert updated.json()["especialidad"] == "Medicina interna"
    assert (
        await client.get("/api/v1/profesionales", headers=headers)
    ).json()["total"] == 1
    assert (
        await client.delete(
            f"/api/v1/profesionales/{professional_id}", headers=headers
        )
    ).status_code == 204


@pytest.mark.asyncio
async def test_professional_directory_requires_clinical_permission(
    client, session_factory
):
    anonymous = await client.get("/api/v1/profesionales")
    assert anonymous.status_code == 401

    patient = (
        await create_user(
            client,
            session_factory,
            email="patient@example.com",
            username="patient-j08",
        )
    ).json()
    forbidden = await client.get(
        "/api/v1/profesionales", headers=auth_headers(patient["id"])
    )
    assert forbidden.status_code == 403
    assert forbidden.json()["error"]["code"] == "forbidden"

    clinician = (
        await create_user(
            client,
            session_factory,
            email="clinician@example.com",
            username="clinician-j08",
        )
    ).json()
    await grant_permissions(session_factory, clinician["id"], "clinica:manage")
    allowed = await client.get(
        "/api/v1/profesionales", headers=auth_headers(clinician["id"])
    )
    assert allowed.status_code == 200


@pytest.mark.asyncio
async def test_professional_mutations_require_user_edit_permission(
    client, session_factory
):
    target = (
        await create_user(
            client,
            session_factory,
            email="target@example.com",
            username="target-j08",
        )
    ).json()

    clinician = (
        await create_user(
            client,
            session_factory,
            email="clinician2@example.com",
            username="clinician2-j08",
        )
    ).json()
    await grant_permissions(session_factory, clinician["id"], "clinica:manage")
    forbidden = await client.post(
        "/api/v1/profesionales",
        headers=auth_headers(clinician["id"]),
        json={
            "persona_id": target["persona"]["id"],
            "especialidad": "Cardiología",
            "numero_licencia": "J08-NO-EDIT",
        },
    )
    assert forbidden.status_code == 403

    manager = (
        await create_user(
            client,
            session_factory,
            email="manager@example.com",
            username="manager-j08",
        )
    ).json()
    await grant_permissions(session_factory, manager["id"], "usuarios:editar")
    created = await client.post(
        "/api/v1/profesionales",
        headers=auth_headers(manager["id"]),
        json={
            "persona_id": target["persona"]["id"],
            "especialidad": "Cardiología",
            "numero_licencia": "J08-EDIT",
        },
    )
    assert created.status_code == 201
