"""B15 -- PDF de una receta individual (GET /prescriptions/{receta_id}/pdf).

El botón "Descargar PDF" en Lumora estaba deshabilitado a propósito
porque este endpoint no existía: la receta y sus detalles se guardaban,
pero el paciente nunca podía obtener un PDF de su tratamiento. Cubre:
acceso propio del paciente, personal clínico, 403 para un tercero sin
relación, auditoría del export, y una receta sin medicamentos todavía.
"""

from datetime import datetime, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from helpers.medical import create_active_medical_professional
from lumora_api.core.security import hash_password
from lumora_api.models import (
    ConsultaMedica,
    EstadoExpediente,
    EventoAuditoria,
    Expediente,
    Paciente,
    Persona,
    Rol,
    UnidadMedida,
    Usuario,
    ViaAdministracion,
)


async def _prescription_catalogs(session_factory) -> tuple[int, int]:
    """Ids reales de UnidadMedida/ViaAdministracion -- el PDF de la receta
    (a diferencia de RecetaResponse) necesita el nombre del catálogo, no
    solo el id, así que no alcanza con un id inventado como en otros
    tests de este archivo hermano."""
    async with session_factory() as session:
        unit = await session.scalar(select(UnidadMedida).where(UnidadMedida.nombre == "mg PDF"))
        if unit is None:
            unit = UnidadMedida(nombre="mg PDF")
            session.add(unit)
            await session.flush()
        route = await session.scalar(
            select(ViaAdministracion).where(ViaAdministracion.nombre == "Oral PDF")
        )
        if route is None:
            route = ViaAdministracion(nombre="Oral PDF")
            session.add(route)
            await session.flush()
        unit_id, route_id = unit.id, route.id
        await session.commit()
        return unit_id, route_id


async def _create_consultation(
    session_factory, *, patient_id: int, professional_id: int, suffix: str
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
            numero_expediente=f"RX-PDF-{suffix}",
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


async def _staff_login_with_professional(
    client: AsyncClient,
    session_factory,
    *,
    username: str,
    numero_licencia: str,
    nombres: str = "Doc",
    apellidos: str = "Profesional",
    especialidad: str = "Medicina general",
) -> tuple[str, int]:
    async with session_factory() as session:
        person = Persona(nombres=nombres, apellidos=apellidos)
        user = Usuario(
            persona=person,
            email=f"{username}@example.com",
            username=username,
            password_hash=hash_password("safe-password"),
        )
        session.add(user)
        await session.flush()
        result = await create_active_medical_professional(session, user=user, username=username)
        professional = result["professional"]
        professional.especialidad = especialidad
        professional_id = professional.id
        await session.commit()

    login = await client.post(
        "/api/v1/auth/login",
        json={"login": username, "password": "safe-password"},
    )
    assert login.status_code == 200
    return login.json()["access_token"], professional_id


async def _patient_login(session_factory, client: AsyncClient, *, username: str, nombres: str, apellidos: str) -> tuple[str, int]:
    async with session_factory() as session:
        role = await session.scalar(select(Rol).where(Rol.nombre == "Paciente"))
        if role is None:
            role = Rol(nombre="Paciente")
            session.add(role)
            await session.flush()
        person = Persona(nombres=nombres, apellidos=apellidos)
        user = Usuario(
            persona=person,
            email=f"{username}@example.com",
            username=username,
            password_hash=hash_password("safe-password"),
            roles=[role],
        )
        session.add(user)
        await session.flush()
        patient = Paciente(persona_id=user.persona_id)
        session.add(patient)
        await session.flush()
        patient_id = patient.id
        await session.commit()

    login = await client.post(
        "/api/v1/auth/login", json={"login": username, "password": "safe-password"}
    )
    assert login.status_code == 200
    return login.json()["access_token"], patient_id


async def _create_prescription(
    client: AsyncClient,
    session_factory,
    *,
    staff_token: str,
    professional_id: int,
    patient_id: int,
    with_detail: bool = True,
) -> str:
    consultation_id = await _create_consultation(
        session_factory,
        patient_id=patient_id,
        professional_id=professional_id,
        suffix=f"PDF-{patient_id}",
    )
    headers = {"Authorization": f"Bearer {staff_token}"}
    detalles = []
    if with_detail:
        medication = await client.post(
            "/api/v1/prescriptions/medications",
            json={"nombre": "Losartán PDF"},
            headers=headers,
        )
        assert medication.status_code == 201
        unit_id, route_id = await _prescription_catalogs(session_factory)
        detalles = [
            {
                "medicamento_id": medication.json()["id"],
                "unidad_medida_id": unit_id,
                "via_administracion_id": route_id,
                "dosis": "50 mg",
                "frecuencia": "Cada 12 horas",
                "duracion_dias": 30,
                "cantidad_total": 60,
                "instrucciones": "Tomar con agua.",
            }
        ]
    created = await client.post(
        "/api/v1/prescriptions",
        json={
            "paciente_id": patient_id,
            "profesional_id": professional_id,
            "consulta_id": consultation_id,
            "titulo": "Tratamiento antihipertensivo",
            "detalles": detalles,
        },
        headers=headers,
    )
    assert created.status_code == 201
    return created.json()["id"]


@pytest.mark.asyncio
async def test_pdf_matches_prescription_and_is_audited(client: AsyncClient, session_factory):
    staff_token, professional_id = await _staff_login_with_professional(
        client, session_factory, username="doc-pdf", numero_licencia="L-PDF"
    )
    patient_token, patient_id = await _patient_login(
        session_factory, client, username="pac-pdf", nombres="Ana", apellidos="PDF"
    )
    receta_id = await _create_prescription(
        client,
        session_factory,
        staff_token=staff_token,
        professional_id=professional_id,
        patient_id=patient_id,
    )

    response = await client.get(
        f"/api/v1/prescriptions/{receta_id}/pdf",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")
    assert receta_id in response.headers["content-disposition"]
    assert "attachment" in response.headers["content-disposition"]

    async with session_factory() as session:
        audit = await session.scalar(
            select(EventoAuditoria).where(
                EventoAuditoria.entidad == "receta_pdf",
                EventoAuditoria.entidad_id == patient_id,
            )
        )
        assert audit is not None
        assert audit.accion == "EXPORT"
        assert audit.datos_nuevos["receta_id"] == receta_id


@pytest.mark.asyncio
async def test_staff_can_download_prescription_pdf(client: AsyncClient, session_factory):
    staff_token, professional_id = await _staff_login_with_professional(
        client, session_factory, username="doc-pdf-staff", numero_licencia="L-PDF-STAFF"
    )
    _, patient_id = await _patient_login(
        session_factory, client, username="pac-pdf-staff", nombres="Luis", apellidos="PDF"
    )
    receta_id = await _create_prescription(
        client,
        session_factory,
        staff_token=staff_token,
        professional_id=professional_id,
        patient_id=patient_id,
    )

    response = await client.get(
        f"/api/v1/prescriptions/{receta_id}/pdf",
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert response.status_code == 200
    assert response.content.startswith(b"%PDF")


@pytest.mark.asyncio
async def test_pdf_requires_same_authorization_as_prescription(
    client: AsyncClient, session_factory
):
    staff_token, professional_id = await _staff_login_with_professional(
        client, session_factory, username="doc-pdf-403", numero_licencia="L-PDF-403"
    )
    _, patient_id = await _patient_login(
        session_factory, client, username="pac-pdf-403", nombres="Rosa", apellidos="PDF"
    )
    outsider_token, _ = await _patient_login(
        session_factory, client, username="pac-pdf-outsider", nombres="Otro", apellidos="Paciente"
    )
    receta_id = await _create_prescription(
        client,
        session_factory,
        staff_token=staff_token,
        professional_id=professional_id,
        patient_id=patient_id,
    )

    response = await client.get(
        f"/api/v1/prescriptions/{receta_id}/pdf",
        headers={"Authorization": f"Bearer {outsider_token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_pdf_renders_prescription_with_no_medications_yet(
    client: AsyncClient, session_factory
):
    staff_token, professional_id = await _staff_login_with_professional(
        client, session_factory, username="doc-pdf-empty", numero_licencia="L-PDF-EMPTY"
    )
    patient_token, patient_id = await _patient_login(
        session_factory, client, username="pac-pdf-empty", nombres="Vacio", apellidos="PDF"
    )
    receta_id = await _create_prescription(
        client,
        session_factory,
        staff_token=staff_token,
        professional_id=professional_id,
        patient_id=patient_id,
        with_detail=False,
    )

    response = await client.get(
        f"/api/v1/prescriptions/{receta_id}/pdf",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert response.status_code == 200
    assert response.content.startswith(b"%PDF")


@pytest.mark.asyncio
async def test_pdf_requires_authentication(client: AsyncClient):
    response = await client.get("/api/v1/prescriptions/nonexistent/pdf")
    assert response.status_code == 401
