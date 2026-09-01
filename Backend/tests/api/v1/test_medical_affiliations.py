from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import func, select

from helpers.medical import create_active_medical_professional
from lumora_api.core.security import create_access_token, hash_token, hash_password
from lumora_api.models import (
    AfiliacionMedica,
    AfiliacionProfesional,
    EventoAuditoria,
    Paciente,
    Persona,
    Permiso,
    ProfesionalSalud,
    Rol,
    TokenRecuperacion,
    Usuario,
)
from lumora_api.schemas.affiliations import ProfessionalProvisionCreate
from lumora_api.services.medical_affiliation_service import MedicalAffiliationService


def _headers(user_id: int) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user_id)}"}


async def _actor(session_factory, *, username: str, role_name: str, permissions=()):
    async with session_factory() as session:
        permission_rows = [Permiso(nombre=name) for name in permissions]
        role = Rol(nombre=role_name, permisos=permission_rows)
        user = Usuario(
            persona=Persona(nombres="B17", apellidos=username),
            email=f"{username}@example.com",
            username=username,
            password_hash=hash_password("safe-password"),
            roles=[role],
        )
        session.add(user)
        await session.commit()
        return user.id


async def _admin(session_factory, username="admin-b17") -> int:
    return await _actor(
        session_factory,
        username=username,
        role_name=f"Administrador {username}",
        permissions=("afiliaciones:manage",),
    )


async def _ensure_standard_medical_role(session_factory):
    async with session_factory() as session:
        permission = await session.scalar(select(Permiso).where(Permiso.nombre == "clinica:manage"))
        if permission is None:
            permission = Permiso(nombre="clinica:manage")
            session.add(permission)
            await session.flush()
        role = await session.scalar(select(Rol).where(Rol.nombre == "Profesional de Salud"))
        if role is None:
            role = Rol(nombre="Profesional de Salud", permisos=[permission])
            session.add(role)
        elif permission not in role.permisos:
            role.permisos.append(permission)
        await session.commit()

async def _medical(session_factory, username="doctor-b17", **overrides):
    async with session_factory() as session:
        context = await create_active_medical_professional(
            session, username=username, email=f"{username}@example.com", **overrides
        )
        await session.commit()
        return {key: value.id for key, value in context.items() if hasattr(value, "id")}


def _affiliation_payload(tipo="institucion", seats=1, **overrides):
    payload = {
        "tipo": tipo,
        "nombre": "Lumora B17",
        "correo_contacto": "afiliaciones@example.com",
        "cupos_comprados": seats,
        "estado": "active",
        "pago_estado": "paid",
    }
    payload.update(overrides)
    return payload


async def _create_affiliation(client, admin_id, *, tipo="institucion", seats=1, **overrides):
    response = await client.post(
        "/api/v1/medical-affiliations",
        headers=_headers(admin_id),
        json=_affiliation_payload(tipo, seats, **overrides),
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.mark.asyncio
async def test_affiliations_support_independent_and_institution_seats(client, session_factory):
    admin_id = await _admin(session_factory)
    independent = await _create_affiliation(client, admin_id, tipo="independiente")
    institution = await _create_affiliation(client, admin_id, tipo="institucion", seats=3)

    assert independent["tipo"] == "independiente"
    assert independent["cupos_comprados"] == 1
    assert institution["tipo"] == "institucion"
    assert institution["cupos_comprados"] == 3
    async with session_factory() as session:
        rows = list(await session.scalars(select(AfiliacionMedica)))
        assert {row.id for row in rows} == {independent["id"], institution["id"]}


@pytest.mark.parametrize("seats", [0, 2, 5])
@pytest.mark.asyncio
async def test_independent_affiliation_requires_exactly_one_seat(client, session_factory, seats):
    admin_id = await _admin(session_factory)
    response = await client.post(
        "/api/v1/medical-affiliations",
        headers=_headers(admin_id),
        json=_affiliation_payload("independiente", seats),
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_affiliation_endpoints_are_internal_and_rbac_scoped(client, session_factory):
    admin_id = await _admin(session_factory)
    medical = await _medical(session_factory, "rbac-doctor")
    patient_id = await _actor(session_factory, username="b17-patient", role_name="Paciente")
    caregiver_id = await _actor(session_factory, username="b17-caregiver", role_name="Cuidador")
    no_permission_id = await _actor(session_factory, username="b17-user", role_name="Usuario")
    affiliation = await _create_affiliation(client, admin_id)

    assert (await client.get("/api/v1/medical-affiliations", headers=_headers(admin_id))).status_code == 200
    for user_id in (medical["user"], patient_id, caregiver_id, no_permission_id):
        assert (await client.get("/api/v1/medical-affiliations", headers=_headers(user_id))).status_code == 403

    assert (await client.get("/api/v1/medical-affiliations", headers=_headers(admin_id))).json()[0]["id"] == affiliation["id"]


@pytest.mark.asyncio
async def test_provisioning_creates_only_medical_identity_and_activation_token(client, session_factory):
    admin_id = await _admin(session_factory, "provision-admin")
    affiliation = await _create_affiliation(client, admin_id)
    await _ensure_standard_medical_role(session_factory)
    response = await client.post(
        f"/api/v1/medical-affiliations/{affiliation['id']}/professionals",
        headers=_headers(admin_id),
        json={
            "first_names": "Ada",
            "last_names": "Medica",
            "email": "ada.provision@example.com",
            "phone": "8888-1111",
            "especialidad": "Medicina general",
            "numero_licencia": "B17-ADA-1",
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert not {"password", "temporary_password", "password_hash"} & body.keys()

    async with session_factory() as session:
        user = await session.get(Usuario, body["user_id"])
        professional = await session.get(ProfesionalSalud, body["professional_id"])
        membership = await session.get(AfiliacionProfesional, body["membership_id"])
        assert user and professional and membership
        assert user.persona_id == professional.persona_id
        assert membership.afiliacion_id == affiliation["id"]
        assert {role.nombre for role in user.roles} == {"Profesional de Salud"}
        assert await session.scalar(select(Paciente).where(Paciente.persona_id == user.persona_id)) is None
        assert await session.scalar(select(TokenRecuperacion).where(TokenRecuperacion.usuario_id == user.id))
        audit = await session.scalar(select(EventoAuditoria).where(EventoAuditoria.accion == "PROVISION_PROFESSIONAL"))
        assert audit and audit.datos_nuevos is None and audit.datos_anteriores is None


@pytest.mark.asyncio
async def test_provisioning_rejects_duplicate_email_and_license_without_side_effects(client, session_factory):
    admin_id = await _admin(session_factory, "duplicate-admin")
    affiliation = await _create_affiliation(client, admin_id, seats=4)
    await _ensure_standard_medical_role(session_factory)
    await _medical(session_factory, "existing-doctor", license_number="LIC-DUP")
    duplicate_email = await client.post(
        f"/api/v1/medical-affiliations/{affiliation['id']}/professionals",
        headers=_headers(admin_id),
        json={"first_names": "New", "last_names": "Email", "email": "existing-doctor@example.com", "especialidad": "Cardio", "numero_licencia": "LIC-NEW"},
    )
    duplicate_license = await client.post(
        f"/api/v1/medical-affiliations/{affiliation['id']}/professionals",
        headers=_headers(admin_id),
        json={"first_names": "New", "last_names": "License", "email": "new-license@example.com", "especialidad": "Cardio", "numero_licencia": "LIC-DUP"},
    )
    assert duplicate_email.status_code == duplicate_license.status_code == 409
    async with session_factory() as session:
        assert await session.scalar(select(Usuario).where(Usuario.email == "new-license@example.com")) is None
        assert await session.scalar(select(AfiliacionProfesional).where(AfiliacionProfesional.afiliacion_id == affiliation["id"])) is None


@pytest.mark.asyncio
async def test_institution_and_independent_seat_limits(client, session_factory):
    admin_id = await _admin(session_factory, "seats-admin")
    institution = await _create_affiliation(client, admin_id, seats=2)
    await _ensure_standard_medical_role(session_factory)
    for suffix in ("a", "b", "c"):
        response = await client.post(
            f"/api/v1/medical-affiliations/{institution['id']}/professionals",
            headers=_headers(admin_id),
            json={"first_names": "Doc", "last_names": suffix, "email": f"seat-{suffix}@example.com", "especialidad": "Medicina general", "numero_licencia": f"SEAT-{suffix}"},
        )
        assert response.status_code == (201 if suffix != "c" else 409)
    independent = await _create_affiliation(client, admin_id, tipo="independiente")
    for suffix in ("one", "two"):
        response = await client.post(
            f"/api/v1/medical-affiliations/{independent['id']}/professionals",
            headers=_headers(admin_id),
            json={"first_names": "Independent", "last_names": suffix, "email": f"ind-{suffix}@example.com", "especialidad": "Medicina general", "numero_licencia": f"IND-{suffix}"},
        )
        assert response.status_code == (201 if suffix == "one" else 409)


@pytest.mark.asyncio
async def test_activation_token_sets_password_and_is_single_use(client, session_factory):
    admin_id = await _admin(session_factory, "activation-admin")
    affiliation = await _create_affiliation(client, admin_id)
    await _ensure_standard_medical_role(session_factory)
    captured = {}

    class Sender:
        def send_password_reset(self, recipient, token):
            captured["recipient"] = recipient
            captured["token"] = token

    async with session_factory() as session:
        service = MedicalAffiliationService(session, email_service=Sender())
        result = await service.provision(
            affiliation["id"],
            __import__("lumora_api.schemas.affiliations", fromlist=["ProfessionalProvisionCreate"]).ProfessionalProvisionCreate(
                first_names="Token", last_names="Doctor", email="token-doctor@example.com", especialidad="Medicina general", numero_licencia="TOKEN-1"
            ),
            admin_id,
        )
    reset = await client.post("/api/v1/auth/reset-password", json={"token": captured["token"], "new_password": "NewStrongPassword1!"})
    assert reset.status_code == 200
    assert (await client.post("/api/v1/auth/reset-password", json={"token": captured["token"], "new_password": "AnotherStrongPassword1!"})).status_code == 400
    assert (await client.post("/api/v1/auth/login", json={"login": "token-doctor", "password": "NewStrongPassword1!"})).status_code == 200
    assert result["activation_sent"] is True


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "overrides",
    [
        {"license_verified": False},
        {"payment_status": "pending"},
        {"affiliation_status": "suspended"},
        {"membership_active": False},
        {"expires_at": datetime.now(timezone.utc) - timedelta(days=1)},
    ],
)
async def test_invalid_medical_context_cannot_write_clinical_data(client, session_factory, overrides):
    context = await _medical(session_factory, f"blocked-{len(overrides)}-{str(overrides)[:5]}", **overrides)
    response = await client.post(
        "/api/v1/prescriptions/medications",
        headers=_headers(context["user"]),
        json={"nombre": "Blocked medication"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_license_verification_and_reactivation_enable_clinical_write(client, session_factory):
    admin_id = await _admin(session_factory, "verify-admin")
    context = await _medical(session_factory, "verify-doctor", license_verified=False)
    headers = _headers(context["user"])
    payload = {"nombre": "Verified medication"}
    assert (await client.post("/api/v1/prescriptions/medications", headers=headers, json=payload)).status_code == 403
    verified = await client.patch(
        f"/api/v1/medical-affiliations/professionals/{context['professional']}/license",
        headers=_headers(admin_id),
        json={"licencia_verificada": True},
    )
    assert verified.status_code == 200
    async with session_factory() as session:
        professional = await session.get(ProfesionalSalud, context["professional"])
        assert professional.licencia_verificada and professional.licencia_verificada_en and professional.licencia_verificada_por_usuario_id == admin_id
        audit = await session.scalar(select(EventoAuditoria).where(EventoAuditoria.accion == 'VERIFY_MEDICAL_LICENSE', EventoAuditoria.entidad_id == context['professional']))
        assert audit and audit.usuario_id == admin_id and audit.datos_nuevos is None and audit.datos_anteriores is None
    assert (await client.post("/api/v1/prescriptions/medications", headers=headers, json=payload)).status_code == 201


@pytest.mark.asyncio
async def test_suspension_preserves_membership_and_reactivation_restores_write(client, session_factory):
    admin_id = await _admin(session_factory, "suspend-admin")
    context = await _medical(session_factory, "suspend-doctor")
    assert (await client.post("/api/v1/prescriptions/medications", headers=_headers(context["user"]), json={"nombre": "Before suspension"})).status_code == 201
    update = await client.patch(
        f"/api/v1/medical-affiliations/{context['affiliation']}",
        headers=_headers(admin_id),
        json={"estado": "suspended"},
    )
    assert update.status_code == 200
    assert (await client.post("/api/v1/prescriptions/medications", headers=_headers(context["user"]), json={"nombre": "After suspension"})).status_code == 403
    assert (await client.patch(f"/api/v1/medical-affiliations/{context['affiliation']}", headers=_headers(admin_id), json={"estado": "active", "pago_estado": "paid"})).status_code == 200
    assert (await client.post("/api/v1/prescriptions/medications", headers=_headers(context["user"]), json={"nombre": "After reactivation"})).status_code == 201
    async with session_factory() as session:
        assert await session.get(AfiliacionProfesional, context["membership"])
        actions = {row.accion for row in await session.scalars(select(EventoAuditoria))}
        assert {"SUSPEND_AFFILIATION", "REACTIVATE_AFFILIATION"} <= actions


@pytest.mark.asyncio
async def test_available_professionals_excludes_inactive_contexts(client, session_factory):
    valid = await _medical(session_factory, "available-valid")
    for suffix, options in (
        ("suspended", {"affiliation_status": "suspended"}),
        ("pending", {"payment_status": "pending"}),
        ("unverified", {"license_verified": False}),
        ("inactive", {"membership_active": False}),
        ("expired", {"expires_at": datetime.now(timezone.utc) - timedelta(days=1)}),
    ):
        await _medical(session_factory, f"available-{suffix}", **options)
    response = await client.get("/api/v1/citas/profesionales-disponibles", headers=_headers(valid["user"]))
    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [valid["professional"]]


@pytest.mark.asyncio
async def test_admin_can_manage_but_is_not_a_medical_professional(client, session_factory):
    admin_id = await _admin(session_factory, "portal-admin")
    response = await client.post("/api/v1/medical-affiliations", headers=_headers(admin_id), json=_affiliation_payload())
    assert response.status_code == 201
    async with session_factory() as session:
        user = await session.get(Usuario, admin_id)
        assert await session.scalar(select(ProfesionalSalud).where(ProfesionalSalud.persona_id == user.persona_id)) is None
        assert await session.scalar(select(AfiliacionProfesional).join(ProfesionalSalud).where(ProfesionalSalud.persona_id == user.persona_id)) is None

@pytest.mark.asyncio
async def test_expired_activation_token_is_rejected(client, session_factory):
    user_id = await _actor(session_factory, username="expired-token", role_name="Expired activation role")
    expired_token = "expired-token-" + "x" * 32
    async with session_factory() as session:
        session.add(TokenRecuperacion(usuario_id=user_id, token_hash=hash_token(expired_token), expires_at=datetime.now(timezone.utc) - timedelta(minutes=1)))
        await session.commit()
    response = await client.post("/api/v1/auth/reset-password", json={"token": expired_token, "new_password": "NewStrongPassword1!"})
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_provisioning_rolls_back_all_entities_on_unexpected_failure(client, session_factory, monkeypatch):
    admin_id = await _admin(session_factory, "rollback-admin")
    affiliation = await _create_affiliation(client, admin_id)
    await _ensure_standard_medical_role(session_factory)

    def fail_audit(*_args):
        raise RuntimeError("forced provisioning failure")

    monkeypatch.setattr(MedicalAffiliationService, "_audit", fail_audit)
    async with session_factory() as session:
        service = MedicalAffiliationService(session)
        with pytest.raises(RuntimeError, match="forced provisioning failure"):
            await service.provision(affiliation["id"], ProfessionalProvisionCreate(first_names="Rollback", last_names="Doctor", email="rollback@example.com", especialidad="Medicina general", numero_licencia="ROLLBACK-1"), admin_id)
        assert await session.scalar(select(Usuario).where(Usuario.email == "rollback@example.com")) is None
        assert await session.scalar(select(ProfesionalSalud).where(ProfesionalSalud.numero_licencia == "ROLLBACK-1")) is None
        assert await session.scalar(select(AfiliacionProfesional).where(AfiliacionProfesional.afiliacion_id == affiliation["id"])) is None
@pytest.mark.asyncio
async def test_institution_affiliation_requires_a_positive_seat_count(client, session_factory):
    admin_id = await _admin(session_factory, "institution-validation-admin")
    response = await client.post("/api/v1/medical-affiliations", headers=_headers(admin_id), json=_affiliation_payload("institucion", 0))
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_affiliation_creation_is_audited(client, session_factory):
    admin_id = await _admin(session_factory, "audit-create-admin")
    affiliation = await _create_affiliation(client, admin_id)
    async with session_factory() as session:
        audit = await session.scalar(select(EventoAuditoria).where(EventoAuditoria.accion == "CREATE_AFFILIATION", EventoAuditoria.entidad_id == affiliation["id"]))
        assert audit and audit.usuario_id == admin_id
        assert audit.datos_nuevos is None and audit.datos_anteriores is None

@pytest.mark.asyncio
async def test_suspended_clinical_user_can_read_clinical_search(client, session_factory):
    context = await _medical(session_factory, "read-suspended", affiliation_status="suspended")
    response = await client.get("/api/v1/clinica/busqueda", headers=_headers(context["user"]))
    assert response.status_code == 200
