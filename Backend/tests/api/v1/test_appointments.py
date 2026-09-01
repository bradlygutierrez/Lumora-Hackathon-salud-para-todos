from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from helpers.medical import create_active_medical_professional
from lumora_api.core.security import create_access_token, hash_password
from lumora_api.models import (
    Cita,
    EstadoCita,
    EventoAuditoria,
    Paciente,
    Permiso,
    Persona,
    ProfesionalSalud,
    RelacionPaciente,
    Rol,
    TipoRelacion,
    TipoCita,
    UbicacionAtencion,
    Usuario,
)


def headers(user_id: int) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {create_access_token(user_id)}",
        "User-Agent": "pytest-agent",
    }


async def seed(session_factory) -> dict[str, int]:
    async with session_factory() as session:
        patient_role = Rol(nombre="Paciente")
        caregiver_role = Rol(nombre="Cuidador")
        clinical_role = Rol(
            nombre="Profesional",
            permisos=[Permiso(nombre="clinica:manage")],
        )
        patient_a_person = Persona(nombres="Ana", apellidos="Paciente")
        patient_b_person = Persona(nombres="Beto", apellidos="Paciente")
        patient_a_user = Usuario(
            persona=patient_a_person,
            email="patient-a@example.com",
            username="patient-a",
            password_hash=hash_password("safe-password"),
            roles=[patient_role],
        )
        patient_b_user = Usuario(
            persona=patient_b_person,
            email="patient-b@example.com",
            username="patient-b",
            password_hash=hash_password("safe-password"),
            roles=[patient_role],
        )
        patient_a = Paciente(persona=patient_a_person)
        patient_b = Paciente(persona=patient_b_person)
        caregiver = Usuario(
            persona=Persona(nombres="Carla", apellidos="Cuidadora"),
            email="caregiver@example.com",
            username="caregiver",
            password_hash=hash_password("safe-password"),
            roles=[caregiver_role],
        )
        revoked_caregiver = Usuario(
            persona=Persona(nombres="Rosa", apellidos="Revocada"),
            email="revoked@example.com",
            username="revoked",
            password_hash=hash_password("safe-password"),
            roles=[caregiver_role],
        )
        clinician = Usuario(
            persona=Persona(nombres="Claudio", apellidos="Clinico"),
            email="clinical@example.com",
            username="clinical",
            password_hash=hash_password("safe-password"),
            roles=[clinical_role],
        )
        professional_a = ProfesionalSalud(
            persona=Persona(nombres="Dora", apellidos="Uno"),
            especialidad="Medicina general",
            numero_licencia="LIC-1",
        )
        professional_b = ProfesionalSalud(
            persona=Persona(nombres="Dario", apellidos="Dos"),
            especialidad="Cardiología",
            numero_licencia="LIC-2",
        )
        pending = EstadoCita(nombre="Pendiente")
        confirmed = EstadoCita(nombre="Confirmada")
        cancelled = EstadoCita(nombre="Cancelada")
        completed = EstadoCita(nombre="Completada")
        relationship_type = TipoRelacion(nombre="Familiar")
        session.add_all(
            [
                patient_a_user,
                patient_b_user,
                patient_a,
                patient_b,
                caregiver,
                revoked_caregiver,
                clinician,
                professional_a,
                professional_b,
                pending,
                confirmed,
                cancelled,
                completed,
                relationship_type,
            ]
        )
        await session.flush()
        clinician_context = await create_active_medical_professional(session, user=clinician)
        clinician_professional = clinician_context["professional"]
        await create_active_medical_professional(session, professional=professional_a, username="availability-a")
        await create_active_medical_professional(session, professional=professional_b, username="availability-b")
        session.add_all(
            [
                RelacionPaciente(
                    paciente_id=patient_a.id,
                    usuario_relacionado_id=caregiver.id,
                    tipo_relacion_id=relationship_type.id,
                    estado="active",
                    activo=True,
                    nivel_acceso="write",
                ),
                RelacionPaciente(
                    paciente_id=patient_a.id,
                    usuario_relacionado_id=revoked_caregiver.id,
                    tipo_relacion_id=relationship_type.id,
                    estado="revoked",
                    activo=False,
                    nivel_acceso="write",
                ),
            ]
        )
        await session.commit()
        return {
            "patient_a": patient_a.id,
            "patient_b": patient_b.id,
            "patient_a_user": patient_a_user.id,
            "patient_b_user": patient_b_user.id,
            "caregiver": caregiver.id,
            "revoked_caregiver": revoked_caregiver.id,
            "clinician": clinician.id,
            "clinician_professional": clinician_professional.id,
            "professional_a": professional_a.id,
            "professional_b": professional_b.id,
            "pending": pending.id,
            "confirmed": confirmed.id,
            "cancelled": cancelled.id,
        }


def payload(
    ctx: dict[str, int],
    start: datetime,
    *,
    patient: str = "patient_a",
    professional: str = "professional_a",
) -> dict[str, object]:
    return {
        "paciente_id": ctx[patient],
        "profesional_id": ctx[professional],
        "inicio": start.isoformat(),
        "fin": (start + timedelta(hours=1)).isoformat(),
        "notas": "Control",
    }


@pytest.mark.asyncio
async def test_patient_lists_only_own_and_detail_is_scoped(client, session_factory):
    ctx = await seed(session_factory)
    start = datetime.now(timezone.utc) + timedelta(days=1)
    own = await client.post(
        "/api/v1/citas",
        json=payload(ctx, start),
        headers=headers(ctx["patient_a_user"]),
    )
    other = await client.post(
        "/api/v1/citas",
        json=payload(ctx, start + timedelta(days=1), patient="patient_b"),
        headers=headers(ctx["patient_b_user"]),
    )

    listed = await client.get("/api/v1/citas", headers=headers(ctx["patient_a_user"]))
    forbidden_list = await client.get(
        f"/api/v1/citas?paciente_id={ctx['patient_b']}",
        headers=headers(ctx["patient_a_user"]),
    )
    forbidden_detail = await client.get(
        f"/api/v1/citas/{other.json()['id']}",
        headers=headers(ctx["patient_a_user"]),
    )

    assert own.status_code == other.status_code == 201
    assert [item["id"] for item in listed.json()] == [own.json()["id"]]
    assert forbidden_list.status_code == forbidden_detail.status_code == 403
    assert own.json()["status"] == {"id": ctx["pending"], "nombre": "Pendiente"}
    assert own.json()["professional"] == {
        "id": ctx["professional_a"],
        "full_name": "Dora Uno",
        "specialty": "Medicina general",
    }


@pytest.mark.asyncio
async def test_patient_create_is_own_only_and_status_is_server_controlled(client, session_factory):
    ctx = await seed(session_factory)
    start = datetime.now(timezone.utc) + timedelta(days=1)
    own = await client.post(
        "/api/v1/citas",
        json=payload(ctx, start),
        headers=headers(ctx["patient_a_user"]),
    )
    foreign = await client.post(
        "/api/v1/citas",
        json=payload(ctx, start + timedelta(days=1), patient="patient_b"),
        headers=headers(ctx["patient_a_user"]),
    )
    controlled = payload(ctx, start + timedelta(days=2))
    controlled["estado_cita_id"] = ctx["confirmed"]
    arbitrary_status = await client.post(
        "/api/v1/citas",
        json=controlled,
        headers=headers(ctx["patient_a_user"]),
    )

    assert own.status_code == 201
    assert foreign.status_code == arbitrary_status.status_code == 403


@pytest.mark.asyncio
async def test_caregiver_operates_only_on_active_authorized_patient(client, session_factory):
    ctx = await seed(session_factory)
    start = datetime.now(timezone.utc) + timedelta(days=1)
    created = await client.post(
        "/api/v1/citas",
        json=payload(ctx, start),
        headers=headers(ctx["caregiver"]),
    )
    listed = await client.get(
        f"/api/v1/citas?paciente_id={ctx['patient_a']}",
        headers=headers(ctx["caregiver"]),
    )
    unrelated = await client.post(
        "/api/v1/citas",
        json=payload(ctx, start + timedelta(days=1), patient="patient_b"),
        headers=headers(ctx["caregiver"]),
    )
    revoked = await client.get(
        f"/api/v1/citas?paciente_id={ctx['patient_a']}",
        headers=headers(ctx["revoked_caregiver"]),
    )
    missing_context = await client.get(
        "/api/v1/citas",
        headers=headers(ctx["caregiver"]),
    )

    assert created.status_code == 201
    assert [item["id"] for item in listed.json()] == [created.json()["id"]]
    assert unrelated.status_code == revoked.status_code == missing_context.status_code == 403


@pytest.mark.asyncio
async def test_reschedule_authorization_conflict_and_audit(client, session_factory):
    ctx = await seed(session_factory)
    start = datetime.now(timezone.utc) + timedelta(days=1)
    created = await client.post(
        "/api/v1/citas",
        json=payload(ctx, start),
        headers=headers(ctx["patient_a_user"]),
    )
    new_start = start + timedelta(days=2)
    rescheduled = await client.patch(
        f"/api/v1/citas/{created.json()['id']}/reprogramar",
        json={
            "inicio": new_start.isoformat(),
            "fin": (new_start + timedelta(hours=1)).isoformat(),
        },
        headers=headers(ctx["patient_a_user"]),
    )
    blocker = await client.post(
        "/api/v1/citas",
        json=payload(ctx, new_start + timedelta(days=1)),
        headers=headers(ctx["patient_a_user"]),
    )
    overlap_start = new_start + timedelta(days=1, minutes=15)
    overlap = await client.patch(
        f"/api/v1/citas/{created.json()['id']}/reprogramar",
        json={
            "inicio": overlap_start.isoformat(),
            "fin": (overlap_start + timedelta(hours=1)).isoformat(),
        },
        headers=headers(ctx["patient_a_user"]),
    )
    unauthorized = await client.patch(
        f"/api/v1/citas/{created.json()['id']}/reprogramar",
        json={
            "inicio": (new_start + timedelta(days=3)).isoformat(),
            "fin": (new_start + timedelta(days=3, hours=1)).isoformat(),
        },
        headers=headers(ctx["patient_b_user"]),
    )

    assert rescheduled.status_code == 200
    assert blocker.status_code == 201
    assert overlap.status_code == 409
    assert unauthorized.status_code == 403
    async with session_factory() as session:
        actions = list(
            await session.scalars(
                select(EventoAuditoria.accion)
                .where(EventoAuditoria.entidad_id == created.json()["id"])
                .order_by(EventoAuditoria.id)
            )
        )
    assert actions == ["CREATE", "RESCHEDULE"]


@pytest.mark.asyncio
async def test_reschedule_presencial_preserves_location(client, session_factory):
    ctx = await seed(session_factory)
    async with session_factory() as session:
        tipo = TipoCita(nombre="Presencial")
        location = UbicacionAtencion(
            nombre="Clinica Central", direccion="Calle Principal 1", activo=True
        )
        session.add_all([tipo, location])
        await session.commit()
        tipo_id, location_id = tipo.id, location.id

    start = datetime.now(timezone.utc) + timedelta(days=5)
    created = await client.post(
        "/api/v1/citas",
        json={
            **payload(ctx, start),
            "tipo_cita_id": tipo_id,
            "ubicacion_id": location_id,
        },
        headers=headers(ctx["patient_a_user"]),
    )
    assert created.status_code == 201

    new_start = start + timedelta(days=1)
    rescheduled = await client.patch(
        f"/api/v1/citas/{created.json()['id']}/reprogramar",
        json={
            "inicio": new_start.isoformat(),
            "fin": (new_start + timedelta(hours=1)).isoformat(),
        },
        headers=headers(ctx["patient_a_user"]),
    )

    assert rescheduled.status_code == 200
    assert rescheduled.json()["ubicacion_id"] == location_id


@pytest.mark.asyncio
async def test_cancellation_preserves_history_and_audit(client, session_factory):
    ctx = await seed(session_factory)
    start = datetime.now(timezone.utc) + timedelta(days=1)
    created = await client.post(
        "/api/v1/citas",
        json=payload(ctx, start),
        headers=headers(ctx["patient_a_user"]),
    )
    unauthorized = await client.post(
        f"/api/v1/citas/{created.json()['id']}/cancelar",
        headers=headers(ctx["patient_b_user"]),
    )
    cancelled = await client.post(
        f"/api/v1/citas/{created.json()['id']}/cancelar",
        headers=headers(ctx["patient_a_user"]),
    )
    repeated = await client.post(
        f"/api/v1/citas/{created.json()['id']}/cancelar",
        headers=headers(ctx["patient_a_user"]),
    )
    history = await client.get("/api/v1/citas", headers=headers(ctx["patient_a_user"]))

    assert unauthorized.status_code == 403
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == {"id": ctx["cancelled"], "nombre": "Cancelada"}
    assert repeated.status_code == 409
    assert created.json()["id"] in [item["id"] for item in history.json()]
    async with session_factory() as session:
        assert await session.get(Cita, created.json()["id"]) is not None
        actions = list(
            await session.scalars(
                select(EventoAuditoria.accion)
                .where(EventoAuditoria.entidad_id == created.json()["id"])
                .order_by(EventoAuditoria.id)
            )
        )
    assert actions == ["CREATE", "CANCEL"]


@pytest.mark.asyncio
async def test_patient_and_professional_overlap_return_409(client, session_factory):
    ctx = await seed(session_factory)
    start = datetime.now(timezone.utc) + timedelta(days=1)
    first = await client.post(
        "/api/v1/citas",
        json=payload(ctx, start),
        headers=headers(ctx["patient_a_user"]),
    )
    patient_overlap = await client.post(
        "/api/v1/citas",
        json=payload(ctx, start + timedelta(minutes=15), professional="professional_b"),
        headers=headers(ctx["patient_a_user"]),
    )
    professional_overlap = await client.post(
        "/api/v1/citas",
        json=payload(ctx, start + timedelta(minutes=15), patient="patient_b"),
        headers=headers(ctx["patient_b_user"]),
    )

    assert first.status_code == 201
    assert patient_overlap.status_code == professional_overlap.status_code == 409


@pytest.mark.asyncio
async def test_safe_professional_discovery_and_admin_route_protection(client, session_factory):
    ctx = await seed(session_factory)
    patient_discovery = await client.get(
        "/api/v1/citas/profesionales-disponibles",
        headers=headers(ctx["patient_a_user"]),
    )
    caregiver_discovery = await client.get(
        "/api/v1/citas/profesionales-disponibles",
        headers=headers(ctx["caregiver"]),
    )
    admin_directory = await client.get(
        "/api/v1/profesionales",
        headers=headers(ctx["patient_a_user"]),
    )

    expected = [
        {"id": ctx["clinician_professional"], "full_name": "Claudio Clinico", "specialty": "Medicina general"},
        {"id": ctx["professional_b"], "full_name": "Dario Dos", "specialty": "Cardiología"},
        {"id": ctx["professional_a"], "full_name": "Dora Uno", "specialty": "Medicina general"},
    ]
    assert patient_discovery.status_code == caregiver_discovery.status_code == 200
    assert patient_discovery.json() == caregiver_discovery.json() == expected
    assert admin_directory.status_code == 403


@pytest.mark.asyncio
async def test_clinical_staff_keeps_broad_crud_behavior(client, session_factory):
    ctx = await seed(session_factory)
    start = datetime.now(timezone.utc) + timedelta(days=1)
    data = payload(ctx, start, patient="patient_b")
    data["estado_cita_id"] = ctx["confirmed"]
    created = await client.post(
        "/api/v1/citas",
        json=data,
        headers=headers(ctx["clinician"]),
    )
    listed = await client.get("/api/v1/citas", headers=headers(ctx["clinician"]))
    updated = await client.patch(
        f"/api/v1/citas/{created.json()['id']}",
        json={"notas": "Actualizada"},
        headers=headers(ctx["clinician"]),
    )
    deleted = await client.delete(
        f"/api/v1/citas/{created.json()['id']}",
        headers=headers(ctx["clinician"]),
    )

    assert created.status_code == 201
    assert [item["id"] for item in listed.json()] == [created.json()["id"]]
    assert updated.status_code == 200
    assert updated.json()["notas"] == "Actualizada"
    assert deleted.status_code == 204


@pytest.mark.asyncio
async def test_appointment_period_validation(client, session_factory):
    ctx = await seed(session_factory)
    start = datetime.now(timezone.utc) + timedelta(days=1)
    response = await client.post(
        "/api/v1/citas",
        json={
            **payload(ctx, start),
            "fin": (start + timedelta(hours=13)).isoformat(),
        },
        headers=headers(ctx["patient_a_user"]),
    )
    assert response.status_code == 422
