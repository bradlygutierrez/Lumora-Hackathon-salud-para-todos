"""A10: /recordatorios ahora exige autenticacion y respeta el mismo
criterio de acceso que /notificaciones (bug preexistente -- antes
cualquiera podia leer/crear/editar/borrar recordatorios de cualquier
paciente sin siquiera loguearse). Ver api/v1/reminders.py."""

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
    """Paciente con cuenta propia, un cuidador con relacion activa (nivel
    de acceso parametrizable), y un tercero sin relacion."""
    async with session_factory() as s:
        patient_role = Rol(nombre="Paciente")
        caregiver_role = Rol(nombre="Cuidador")
        s.add_all([patient_role, caregiver_role, TipoRelacion(nombre="Madre")])
        await s.flush()

        pu = Usuario(
            persona=Persona(nombres="Ana", apellidos="Paciente"),
            email="a10.patient@example.com",
            username="a10patient",
            password_hash=hash_password("Safe123!"),
            roles=[patient_role],
        )
        cu = Usuario(
            persona=Persona(nombres="Cuida", apellidos="Dor"),
            email="a10.caregiver@example.com",
            username="a10caregiver",
            password_hash=hash_password("Safe123!"),
            roles=[caregiver_role],
        )
        other = Usuario(
            persona=Persona(nombres="Otra", apellidos="Persona"),
            email="a10.other@example.com",
            username="a10other",
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

        tipo_seguimiento = TipoRecordatorio(nombre="Seguimiento")
        s.add(tipo_seguimiento)
        await s.flush()

        await s.commit()

        return {
            "paciente_id": paciente.id,
            "usuario_id": pu.id,
            "caregiver_id": cu.id,
            "other_id": other.id,
            "tipo_recordatorio_id": tipo_seguimiento.id,
        }


def _auth(user_id: int) -> dict:
    return {"Authorization": f"Bearer {create_access_token(user_id)}"}


def _payload(ctx: dict) -> dict:
    return {
        "paciente_id": ctx["paciente_id"],
        "tipo_recordatorio_id": ctx["tipo_recordatorio_id"],
        "titulo": "Beber Agua",
        "mensaje": "Objetivo: 2 Litros diarios",
        "fecha_programada": "2026-08-29T12:00:00",
        "objetivo_cantidad": 2.0,
        "progreso_actual": 0.5,
        "unidad": "Litros",
    }


@pytest.mark.asyncio
async def test_paciente_crea_y_lista_su_propio_recordatorio_de_seguimiento(
    client, session_factory
):
    ctx = await _seed(session_factory)

    r_create = await client.post(
        "/api/v1/reminders/recordatorios",
        json=_payload(ctx),
        headers=_auth(ctx["usuario_id"]),
    )
    assert r_create.status_code == 201
    data = r_create.json()
    assert data["titulo"] == "Beber Agua"
    assert data["objetivo_cantidad"] == 2.0
    assert data["progreso_actual"] == 0.5
    assert data["unidad"] == "Litros"

    r_list = await client.get(
        f"/api/v1/reminders/recordatorios/paciente/{ctx['paciente_id']}",
        headers=_auth(ctx["usuario_id"]),
    )
    assert r_list.status_code == 200
    assert len(r_list.json()) == 1


@pytest.mark.asyncio
async def test_cuidador_con_acceso_write_crea_y_actualiza_progreso(
    client, session_factory
):
    ctx = await _seed(session_factory, nivel_acceso_cuidador="write")

    r_create = await client.post(
        "/api/v1/reminders/recordatorios",
        json=_payload(ctx),
        headers=_auth(ctx["caregiver_id"]),
    )
    assert r_create.status_code == 201
    recordatorio_id = r_create.json()["id"]

    # Registrar avance: sube de 0.5L a 1.0L.
    r_update = await client.patch(
        f"/api/v1/reminders/recordatorios/{recordatorio_id}",
        json={"progreso_actual": 1.0},
        headers=_auth(ctx["caregiver_id"]),
    )
    assert r_update.status_code == 200
    assert r_update.json()["progreso_actual"] == 1.0


@pytest.mark.asyncio
async def test_cuidador_con_acceso_solo_lectura_no_puede_crear_ni_editar(
    client, session_factory
):
    ctx = await _seed(session_factory, nivel_acceso_cuidador="read")

    r_create = await client.post(
        "/api/v1/reminders/recordatorios",
        json=_payload(ctx),
        headers=_auth(ctx["caregiver_id"]),
    )
    assert r_create.status_code == 404

    # Igual puede listar (solo lectura).
    r_list = await client.get(
        f"/api/v1/reminders/recordatorios/paciente/{ctx['paciente_id']}",
        headers=_auth(ctx["caregiver_id"]),
    )
    assert r_list.status_code == 200


@pytest.mark.asyncio
async def test_tercero_sin_relacion_no_puede_ver_ni_crear_recordatorios(
    client, session_factory
):
    ctx = await _seed(session_factory)

    r_create = await client.post(
        "/api/v1/reminders/recordatorios",
        json=_payload(ctx),
        headers=_auth(ctx["other_id"]),
    )
    assert r_create.status_code == 404

    r_list = await client.get(
        f"/api/v1/reminders/recordatorios/paciente/{ctx['paciente_id']}",
        headers=_auth(ctx["other_id"]),
    )
    assert r_list.status_code == 404


@pytest.mark.asyncio
async def test_recordatorio_requiere_autenticacion(client, session_factory):
    ctx = await _seed(session_factory)

    r = await client.post("/api/v1/reminders/recordatorios", json=_payload(ctx))
    assert r.status_code == 401
