from datetime import date, datetime

import pytest
from sqlalchemy import select

from lumora_api.core.security import create_access_token
from lumora_api.models import Direccion, Paciente, Persona, RelacionPaciente, Rol, Sexo, TipoRelacion, Usuario
from lumora_api.repositories.account_repository import AccountRepository
from lumora_api.services.account_service import AccountService


class MemoryImageStorage:
    def __init__(self) -> None:
        self.files: dict[str, bytes] = {}
        self.deleted: list[str] = []

    async def save(self, content: bytes, extension: str) -> str:
        url = f"https://images.test/{len(self.files) + 1}.{extension}"
        self.files[url] = content
        return url

    async def delete(self, url: str | None) -> None:
        if url:
            self.deleted.append(url)
            self.files.pop(url, None)


def auth_headers(user_id: int) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user_id)}"}


async def create_account_user(session_factory, role_name: str, *, suffix: str) -> dict[str, int | str]:
    async with session_factory() as session:
        role = await session.scalar(select(Rol).where(Rol.nombre == role_name))
        if role is None:
            role = Rol(nombre=role_name)
        person = Persona(
            nombres=f"{role_name} Nombre",
            apellidos=f"{role_name} Apellido",
            fecha_nacimiento=date(1990, 1, 2),
            telefono="8888-0000",
            email=f"{suffix}@persona.example.com",
        )
        user = Usuario(
            persona=person,
            email=f"{suffix}@example.com",
            username=suffix,
            password_hash="not-used-by-token-tests",
            roles=[role],
        )
        session.add(user)
        await session.commit()
        return {"id": user.id, "person_id": person.id, "email": user.email, "username": user.username}


@pytest.mark.asyncio
async def test_account_me_returns_own_explicit_identity(client, session_factory):
    user = await create_account_user(session_factory, "Paciente", suffix="patient-account")
    response = await client.get("/api/v1/account/me", headers=auth_headers(user["id"]))

    assert response.status_code == 200
    assert response.json()["id"] == user["id"]
    assert set(response.json()) == {"id", "username", "email", "email_verified", "profile_image_url", "person", "roles"}
    assert response.json()["person"] == {
        "id": user["person_id"],
        "first_names": "Paciente Nombre",
        "last_names": "Paciente Apellido",
        "birth_date": "1990-01-02",
        "phone": "8888-0000",
        "email": "patient-account@persona.example.com",
        "sex_id": None,
        "addresses": [],
    }
    assert response.json()["roles"] == [{"id": 1, "name": "Paciente"}]
    assert response.json()["profile_image_url"] is None


@pytest.mark.asyncio
async def test_account_me_returns_caregivers_own_identity_not_linked_patient(client, session_factory):
    patient = await create_account_user(session_factory, "Paciente", suffix="linked-patient")
    caregiver = await create_account_user(session_factory, "Cuidador", suffix="caregiver-account")
    async with session_factory() as session:
        patient_record = Paciente(persona_id=patient["person_id"])
        relationship_type = TipoRelacion(nombre="Madre")
        session.add_all([patient_record, relationship_type])
        await session.flush()
        session.add(
            RelacionPaciente(
                paciente_id=patient_record.id,
                usuario_relacionado_id=caregiver["id"],
                tipo_relacion_id=relationship_type.id,
            )
        )
        await session.commit()

    response = await client.get("/api/v1/account/me", headers=auth_headers(caregiver["id"]))

    assert response.status_code == 200
    assert response.json()["id"] == caregiver["id"]
    assert response.json()["person"]["id"] == caregiver["person_id"]
    assert response.json()["person"]["first_names"] == "Cuidador Nombre"


@pytest.mark.asyncio
async def test_account_me_requires_authentication(client):
    response = await client.get("/api/v1/account/me")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_account_update_allows_only_profile_fields_and_is_immediately_consistent(client, session_factory):
    user = await create_account_user(session_factory, "Paciente", suffix="update-account")
    async with session_factory() as session:
        session.add(Sexo(id=1, nombre="Femenino"))
        await session.commit()

    response = await client.patch(
        "/api/v1/account/me",
        headers=auth_headers(user["id"]),
        json={
            "username": " Updated.Account ",
            "email": " UPDATED@EXAMPLE.COM ",
            "person": {
                "first_names": "Ana",
                "last_names": "López",
                "birth_date": "2001-02-03",
                "phone": "8888-1111",
                "sex_id": 1,
            },
        },
    )

    assert response.status_code == 200
    assert response.json()["username"] == "updated.account"
    assert response.json()["email"] == "updated@example.com"
    assert response.json()["person"] == {
        "id": user["person_id"],
        "first_names": "Ana",
        "last_names": "López",
        "birth_date": "2001-02-03",
        "phone": "8888-1111",
        "email": "updated@example.com",
        "sex_id": 1,
        "addresses": [],
    }
    auth_read = await client.get("/api/v1/auth/me", headers=auth_headers(user["id"]))
    assert auth_read.status_code == 200
    assert auth_read.json()["username"] == "updated.account"
    assert auth_read.json()["email"] == "updated@example.com"
    assert auth_read.json()["persona"] == {"id": user["person_id"], "nombres": "Ana", "apellidos": "López"}


@pytest.mark.asyncio
async def test_account_update_rejects_duplicate_email_and_username(client, session_factory):
    user = await create_account_user(session_factory, "Paciente", suffix="account-owner")
    other = await create_account_user(session_factory, "Paciente", suffix="account-other")

    duplicate_username = await client.patch(
        "/api/v1/account/me",
        headers=auth_headers(user["id"]),
        json={"username": other["username"]},
    )
    duplicate_email = await client.patch(
        "/api/v1/account/me",
        headers=auth_headers(user["id"]),
        json={"email": other["email"]},
    )

    assert duplicate_username.status_code == duplicate_email.status_code == 409


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "payload",
    [
        {"username": "no"},
        {"unknown": "value"},
        {"password": "new-password"},
        {"roles": []},
        {"activo": False},
        {"id": 99},
        {"persona_id": 99},
        {"person": {"first_names": 42}},
    ],
)
async def test_account_update_rejects_malformed_unknown_and_forbidden_fields(client, session_factory, payload):
    user = await create_account_user(session_factory, "Paciente", suffix="forbidden")
    response = await client.patch("/api/v1/account/me", headers=auth_headers(user["id"]), json=payload)

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_account_update_rejects_unknown_sex(client, session_factory):
    user = await create_account_user(session_factory, "Paciente", suffix="unknown-sex")

    response = await client.patch(
        "/api/v1/account/me",
        headers=auth_headers(user["id"]),
        json={"person": {"sex_id": 999}},
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_account_me_excludes_deleted_addresses(client, session_factory):
    user = await create_account_user(session_factory, "Paciente", suffix="address-account")
    async with session_factory() as session:
        session.add_all(
            [
                Direccion(persona_id=user["person_id"], linea_1="Visible", ciudad="Managua", pais="Nicaragua", es_principal=True),
                Direccion(persona_id=user["person_id"], linea_1="Hidden", ciudad="Managua", pais="Nicaragua", deleted_at=datetime(2026, 1, 1)),
            ]
        )
        await session.commit()

    response = await client.get("/api/v1/account/me", headers=auth_headers(user["id"]))

    assert response.status_code == 200
    assert response.json()["person"]["addresses"] == [
        {
            "id": 1,
            "line_1": "Visible",
            "city": "Managua",
            "department": None,
            "country": "Nicaragua",
            "postal_code": None,
            "is_primary": True,
        }
    ]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("content_type", "content", "extension"),
    [
        ("image/jpeg", bytes.fromhex("ffd8ff") + b"valid", "jpg"),
        ("image/png", bytes.fromhex("89504e470d0a1a0a") + b"valid", "png"),
        ("image/webp", b"RIFF1234WEBPvalid", "webp"),
    ],
)
async def test_profile_image_upload_persists_supported_images(
    client, session_factory, monkeypatch, content_type, content, extension
):
    from lumora_api.api.v1 import account

    user = await create_account_user(session_factory, "Paciente", suffix=f"image-{extension}")
    storage = MemoryImageStorage()
    monkeypatch.setattr(account, "service", lambda session: AccountService(AccountRepository(session), storage))
    response = await client.post(
        "/api/v1/account/me/profile-image",
        headers=auth_headers(user["id"]),
        files={"file": (f"ignored.{extension}", content, content_type)},
    )
    assert response.status_code == 200
    assert response.json()["profile_image_url"].endswith(f".{extension}")
    read = await client.get("/api/v1/account/me", headers=auth_headers(user["id"]))
    assert read.json()["profile_image_url"] == response.json()["profile_image_url"]
    assert storage.files[response.json()["profile_image_url"]] == content


@pytest.mark.asyncio
async def test_profile_image_rejects_unsupported_mime_and_oversized_file(client, session_factory):
    user = await create_account_user(session_factory, "Paciente", suffix="bad-image")
    unsupported = await client.post(
        "/api/v1/account/me/profile-image",
        headers=auth_headers(user["id"]),
        files={"file": ("x.gif", b"GIF89a", "image/gif")},
    )
    oversized = await client.post(
        "/api/v1/account/me/profile-image",
        headers=auth_headers(user["id"]),
        files={"file": ("x.jpg", bytes.fromhex("ffd8ff") + b"x" * (5 * 1024 * 1024), "image/jpeg")},
    )
    assert unsupported.status_code == oversized.status_code == 422


@pytest.mark.asyncio
async def test_profile_image_replacement_and_delete_are_self_scoped(client, session_factory, monkeypatch):
    from lumora_api.api.v1 import account

    owner = await create_account_user(session_factory, "Paciente", suffix="image-owner")
    other = await create_account_user(session_factory, "Cuidador", suffix="image-other")
    storage = MemoryImageStorage()
    monkeypatch.setattr(account, "service", lambda session: AccountService(AccountRepository(session), storage))
    first = await client.post(
        "/api/v1/account/me/profile-image",
        headers=auth_headers(owner["id"]),
        files={"file": ("a.jpg", bytes.fromhex("ffd8ff") + b"one", "image/jpeg")},
    )
    second = await client.post(
        "/api/v1/account/me/profile-image",
        headers=auth_headers(owner["id"]),
        files={"file": ("b.png", bytes.fromhex("89504e470d0a1a0a") + b"two", "image/png")},
    )
    other_delete = await client.delete("/api/v1/account/me/profile-image", headers=auth_headers(other["id"]))
    owner_read = await client.get("/api/v1/account/me", headers=auth_headers(owner["id"]))
    owner_delete = await client.delete("/api/v1/account/me/profile-image", headers=auth_headers(owner["id"]))
    assert first.json()["profile_image_url"] in storage.deleted
    assert owner_read.json()["profile_image_url"] == second.json()["profile_image_url"]
    assert other_delete.json()["profile_image_url"] is None
    assert owner_delete.json()["profile_image_url"] is None
    assert second.json()["profile_image_url"] in storage.deleted


@pytest.mark.asyncio
async def test_mobile_role_cannot_use_generic_users_routes(client, session_factory):
    owner = await create_account_user(session_factory, "Paciente", suffix="generic-owner")
    other = await create_account_user(session_factory, "Cuidador", suffix="generic-other")
    responses = [
        await client.get("/api/v1/usuarios", headers=auth_headers(owner["id"])),
        await client.get(f"/api/v1/usuarios/{other['id']}", headers=auth_headers(owner["id"])),
        await client.patch(
            f"/api/v1/usuarios/{other['id']}",
            headers=auth_headers(owner["id"]),
            json={"username": "idor"},
        ),
        await client.delete(f"/api/v1/usuarios/{other['id']}", headers=auth_headers(owner["id"])),
    ]
    assert [response.status_code for response in responses] == [403, 403, 403, 403]
