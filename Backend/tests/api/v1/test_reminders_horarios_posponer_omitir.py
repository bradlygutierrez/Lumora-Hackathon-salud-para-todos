"""Posponer / Omitir de un recordatorio, y los horarios de un
recordatorio (las horas del dia elegidas para repartir objetivo_cantidad,
ej. "Beber agua": 2 Litros repartidos en 08:00/12:00/16:00/20:00).

Mismo criterio de acceso A10 que el resto de /recordatorios (ver
test_reminders_recordatorios.py): paciente dueno, cuidador con relacion
activa (lectura siempre, escritura solo con nivel_acceso="write"), o
tercero sin relacion -> 404.
"""

import pytest

from lumora_api.core.security import create_access_token, hash_password
from lumora_api.models import (
    Paciente,
    Persona,
    RelacionPaciente,
    Rol,
    TipoRecordatorio,
    TipoRelacion,
    Usuario,
)


async def _seed(session_factory, nivel_acceso_cuidador: str = "write"):
    async with session_factory() as s:
        patient_role = Rol(nombre="Paciente")
        caregiver_role = Rol(nombre="Cuidador")
        s.add_all([patient_role, caregiver_role, TipoRelacion(nombre="Madre")])
        await s.flush()

        pu = Usuario(
            persona=Persona(nombres="Ana", apellidos="Paciente"),
            email="horarios.patient@example.com",
            username="horarios_patient",
            password_hash=hash_password("Safe123!"),
            roles=[patient_role],
        )
        cu = Usuario(
            persona=Persona(nombres="Cuida", apellidos="Dor"),
            email="horarios.caregiver@example.com",
            username="horarios_caregiver",
            password_hash=hash_password("Safe123!"),
            roles=[caregiver_role],
        )
        other = Usuario(
            persona=Persona(nombres="Otra", apellidos="Persona"),
            email="horarios.other@example.com",
            username="horarios_other",
            password_hash=hash_password("Safe123!"),
            roles=[patient_role],
        )
        s.add_all([pu, cu, other])
        await s.flush()

        paciente = Paciente(persona_id=pu.persona_id)
        s.add(paciente)
        await s.flush()

        rel = RelacionPaciente(
            paciente_id=paciente.id,
            usuario_relacionado_id=cu.id,
            tipo_relacion_id=1,
            estado="active",
            activo=True,
            nivel_acceso=nivel_acceso_cuidador,
        )
        s.add(rel)

        tipo = TipoRecordatorio(nombre="Seguimiento")
        s.add(tipo)
        await s.flush()

        await s.commit()

        return {
            "paciente_id": paciente.id,
            "usuario_id": pu.id,
            "caregiver_id": cu.id,
            "other_id": other.id,
            "tipo_recordatorio_id": tipo.id,
        }


def _auth(user_id: int) -> dict:
    return {"Authorization": f"Bearer {create_access_token(user_id)}"}


def _payload_beber_agua(ctx: dict, horarios: list | None = None) -> dict:
    return {
        "paciente_id": ctx["paciente_id"],
        "tipo_recordatorio_id": ctx["tipo_recordatorio_id"],
        "titulo": "Beber agua",
        "mensaje": "2 litros diarios",
        "fecha_programada": "2026-08-30T08:00:00",
        "objetivo_cantidad": 2.0,
        "unidad": "Litros",
        "horarios": horarios or [],
    }


async def _crear_recordatorio(client, ctx, headers, horarios=None):
    r = await client.post(
        "/api/v1/reminders/recordatorios",
        json=_payload_beber_agua(ctx, horarios),
        headers=headers,
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


# --- Horarios: creacion al vuelo con el recordatorio + reparto ---


@pytest.mark.asyncio
async def test_crear_recordatorio_con_horarios_reparte_objetivo_por_igual(
    client, session_factory
):
    ctx = await _seed(session_factory)
    headers = _auth(ctx["usuario_id"])

    rec_id = await _crear_recordatorio(
        client,
        ctx,
        headers,
        horarios=[{"hora": "08:00:00"}, {"hora": "12:00:00"}, {"hora": "16:00:00"}, {"hora": "20:00:00"}],
    )

    r_horarios = await client.get(
        f"/api/v1/reminders/recordatorios/{rec_id}/horarios", headers=headers
    )
    assert r_horarios.status_code == 200
    horarios = r_horarios.json()
    assert len(horarios) == 4
    assert all(h["cantidad_objetivo"] is None for h in horarios)
    assert all(h["cantidad_efectiva"] == 0.5 for h in horarios)


@pytest.mark.asyncio
async def test_horario_con_cantidad_explicita_no_se_reparte(client, session_factory):
    ctx = await _seed(session_factory)
    headers = _auth(ctx["usuario_id"])

    rec_id = await _crear_recordatorio(client, ctx, headers)

    r1 = await client.post(
        f"/api/v1/reminders/recordatorios/{rec_id}/horarios",
        json={"hora": "08:00:00", "cantidad_objetivo": 1.5},
        headers=headers,
    )
    assert r1.status_code == 201
    assert r1.json()["cantidad_efectiva"] == 1.5

    r2 = await client.post(
        f"/api/v1/reminders/recordatorios/{rec_id}/horarios",
        json={"hora": "20:00:00"},
        headers=headers,
    )
    assert r2.status_code == 201
    assert r2.json()["cantidad_efectiva"] == 1.0


@pytest.mark.asyncio
async def test_actualizar_y_eliminar_horario(client, session_factory):
    ctx = await _seed(session_factory)
    headers = _auth(ctx["usuario_id"])
    rec_id = await _crear_recordatorio(
        client, ctx, headers, horarios=[{"hora": "08:00:00"}, {"hora": "20:00:00"}]
    )

    r_list = await client.get(
        f"/api/v1/reminders/recordatorios/{rec_id}/horarios", headers=headers
    )
    horario_id = r_list.json()[0]["id"]

    r_update = await client.patch(
        f"/api/v1/reminders/recordatorios/{rec_id}/horarios/{horario_id}",
        json={"hora": "09:30:00"},
        headers=headers,
    )
    assert r_update.status_code == 200
    assert r_update.json()["hora"] == "09:30:00"

    r_delete = await client.delete(
        f"/api/v1/reminders/recordatorios/{rec_id}/horarios/{horario_id}", headers=headers
    )
    assert r_delete.status_code == 204

    r_list2 = await client.get(
        f"/api/v1/reminders/recordatorios/{rec_id}/horarios", headers=headers
    )
    restantes = r_list2.json()
    assert len(restantes) == 1
    assert restantes[0]["cantidad_efectiva"] == 2.0


@pytest.mark.asyncio
async def test_horarios_respetan_control_de_acceso(client, session_factory):
    ctx = await _seed(session_factory, nivel_acceso_cuidador="read")
    rec_id = await _crear_recordatorio(
        client, ctx, _auth(ctx["usuario_id"]), horarios=[{"hora": "08:00:00"}]
    )

    r_create = await client.post(
        f"/api/v1/reminders/recordatorios/{rec_id}/horarios",
        json={"hora": "12:00:00"},
        headers=_auth(ctx["caregiver_id"]),
    )
    assert r_create.status_code == 404

    r_list = await client.get(
        f"/api/v1/reminders/recordatorios/{rec_id}/horarios", headers=_auth(ctx["caregiver_id"])
    )
    assert r_list.status_code == 200

    r_third = await client.get(
        f"/api/v1/reminders/recordatorios/{rec_id}/horarios", headers=_auth(ctx["other_id"])
    )
    assert r_third.status_code == 404


# --- Posponer / Omitir ---


@pytest.mark.asyncio
async def test_paciente_pospone_su_recordatorio(client, session_factory):
    ctx = await _seed(session_factory)
    headers = _auth(ctx["usuario_id"])
    rec_id = await _crear_recordatorio(client, ctx, headers)

    r = await client.post(
        f"/api/v1/reminders/recordatorios/{rec_id}/posponer",
        json={"nueva_fecha_programada": "2026-08-30T09:30:00"},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["estado"] == "pospuesto"
    assert data["fecha_programada"].startswith("2026-08-30T09:30:00")


@pytest.mark.asyncio
async def test_cuidador_con_write_omite_recordatorio(client, session_factory):
    ctx = await _seed(session_factory, nivel_acceso_cuidador="write")
    rec_id = await _crear_recordatorio(client, ctx, _auth(ctx["usuario_id"]))

    r = await client.post(
        f"/api/v1/reminders/recordatorios/{rec_id}/omitir",
        headers=_auth(ctx["caregiver_id"]),
    )
    assert r.status_code == 200, r.text
    assert r.json()["estado"] == "omitido"


@pytest.mark.asyncio
async def test_posponer_y_omitir_requieren_acceso_de_escritura(client, session_factory):
    ctx = await _seed(session_factory, nivel_acceso_cuidador="read")
    rec_id = await _crear_recordatorio(client, ctx, _auth(ctx["usuario_id"]))

    r_posponer = await client.post(
        f"/api/v1/reminders/recordatorios/{rec_id}/posponer",
        json={"nueva_fecha_programada": "2026-08-30T09:30:00"},
        headers=_auth(ctx["caregiver_id"]),
    )
    assert r_posponer.status_code == 404

    r_omitir = await client.post(
        f"/api/v1/reminders/recordatorios/{rec_id}/omitir",
        headers=_auth(ctx["caregiver_id"]),
    )
    assert r_omitir.status_code == 404


@pytest.mark.asyncio
async def test_posponer_y_omitir_requieren_autenticacion(client, session_factory):
    ctx = await _seed(session_factory)
    rec_id = await _crear_recordatorio(client, ctx, _auth(ctx["usuario_id"]))

    r_posponer = await client.post(
        f"/api/v1/reminders/recordatorios/{rec_id}/posponer",
        json={"nueva_fecha_programada": "2026-08-30T09:30:00"},
    )
    assert r_posponer.status_code == 401

    r_omitir = await client.post(f"/api/v1/reminders/recordatorios/{rec_id}/omitir")
    assert r_omitir.status_code == 401
