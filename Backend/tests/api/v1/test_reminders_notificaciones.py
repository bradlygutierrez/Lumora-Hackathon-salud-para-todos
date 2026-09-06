import uuid
from datetime import datetime

import pytest

from lumora_api.core.security import create_access_token, hash_password
from lumora_api.models import (
    Notificacion,
    Paciente,
    Persona,
    Recordatorio,
    RelacionPaciente,
    Rol,
    TipoRecordatorio,
    TipoRelacion,
    Usuario,
)


async def _seed(session_factory):
    """Paciente con cuenta propia, un cuidador con relacion activa de
    lectura, un tercero sin relacion, y dos notificaciones (una con
    Recordatorio->alerta_id, una 'de sistema' sin Recordatorio)."""
    async with session_factory() as s:
        patient_role = Rol(nombre="Paciente")
        caregiver_role = Rol(nombre="Cuidador")
        s.add_all([patient_role, caregiver_role, TipoRelacion(nombre="Madre")])
        await s.flush()

        pu = Usuario(
            persona=Persona(nombres="Ana", apellidos="Paciente"),
            email="a09.patient@example.com",
            username="a09patient",
            password_hash=hash_password("Safe123!"),
            roles=[patient_role],
        )
        cu = Usuario(
            persona=Persona(nombres="Cuida", apellidos="Dor"),
            email="a09.caregiver@example.com",
            username="a09caregiver",
            password_hash=hash_password("Safe123!"),
            roles=[caregiver_role],
        )
        other = Usuario(
            persona=Persona(nombres="Otra", apellidos="Persona"),
            email="a09.other@example.com",
            username="a09other",
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
            nivel_acceso="write",
        )
        s.add(rel)

        tipo_recordatorio = TipoRecordatorio(nombre="Medición")
        s.add(tipo_recordatorio)
        await s.flush()

        recordatorio = Recordatorio(
            paciente_id=paciente.id,
            tipo_recordatorio_id=tipo_recordatorio.id,
            # A09: Recordatorio.alerta_id es FK a alertas_clinicas.id,
            # que es UUID (no int) -- un id real no hace falta porque
            # SQLite en estos tests no valida la FK, pero el tipo si
            # tiene que coincidir con la columna real.
            alerta_id=uuid.uuid4(),
            titulo="Alerta: Presión Arterial fuera de rango",
            mensaje="Tu última medición está fuera del rango normal.",
            fecha_programada=datetime(2026, 8, 25, 8, 0, 0),
        )
        s.add(recordatorio)
        await s.flush()

        notif_alerta = Notificacion(
            usuario_id=pu.id,
            recordatorio_id=recordatorio.id,
            titulo=recordatorio.titulo,
            mensaje=recordatorio.mensaje,
        )
        notif_sistema = Notificacion(
            usuario_id=pu.id,
            titulo="Bienvenida",
            mensaje="Bienvenida a Lumora",
        )
        s.add_all([notif_alerta, notif_sistema])
        await s.commit()

        return {
            "paciente_id": paciente.id,
            "usuario_id": pu.id,
            "caregiver_id": cu.id,
            "other_id": other.id,
            "notif_alerta_id": notif_alerta.id,
            "notif_sistema_id": notif_sistema.id,
        }


def _auth(user_id: int) -> dict:
    return {"Authorization": f"Bearer {create_access_token(user_id)}"}


@pytest.mark.asyncio
async def test_listar_notificaciones_por_usuario_calcula_tipo_y_es_solo_propia(
    client, session_factory
):
    ctx = await _seed(session_factory)

    r = await client.get(
        f"/api/v1/reminders/notificaciones/usuario/{ctx['usuario_id']}",
        headers=_auth(ctx["usuario_id"]),
    )
    assert r.status_code == 200
    by_id = {item["id"]: item for item in r.json()}
    assert by_id[ctx["notif_alerta_id"]]["tipo"] == "alerta"
    assert by_id[ctx["notif_sistema_id"]]["tipo"] == "sistema"

    # Nadie mas puede consultar las notificaciones de otro usuario por
    # este endpoint (esta acotado a usuario_id == current_user.id).
    r_denied = await client.get(
        f"/api/v1/reminders/notificaciones/usuario/{ctx['usuario_id']}",
        headers=_auth(ctx["other_id"]),
    )
    assert r_denied.status_code == 403


@pytest.mark.asyncio
async def test_listar_notificaciones_por_paciente_permite_cuidador_autorizado(
    client, session_factory
):
    ctx = await _seed(session_factory)

    # El propio paciente.
    r_owner = await client.get(
        f"/api/v1/reminders/notificaciones/paciente/{ctx['paciente_id']}",
        headers=_auth(ctx["usuario_id"]),
    )
    assert r_owner.status_code == 200
    assert len(r_owner.json()) == 2

    # El cuidador con relacion activa.
    r_caregiver = await client.get(
        f"/api/v1/reminders/notificaciones/paciente/{ctx['paciente_id']}",
        headers=_auth(ctx["caregiver_id"]),
    )
    assert r_caregiver.status_code == 200
    assert len(r_caregiver.json()) == 2

    # Un tercero sin relacion no ve nada -- ni siquiera se le confirma
    # que el paciente existe.
    r_other = await client.get(
        f"/api/v1/reminders/notificaciones/paciente/{ctx['paciente_id']}",
        headers=_auth(ctx["other_id"]),
    )
    assert r_other.status_code == 404


@pytest.mark.asyncio
async def test_marcar_notificacion_leida_solo_dueno_o_cuidador_autorizado(
    client, session_factory
):
    ctx = await _seed(session_factory)

    # "other" no es el dueño de la notificacion ni tiene relacion con el
    # paciente dueño de esa cuenta -- PatientAccessService.require_access
    # deniega devolviendo 404 (no confirma que el paciente exista).
    r_denied = await client.patch(
        f"/api/v1/reminders/notificaciones/{ctx['notif_sistema_id']}/marcar-leida",
        headers=_auth(ctx["other_id"]),
    )
    assert r_denied.status_code == 404

    r_owner = await client.patch(
        f"/api/v1/reminders/notificaciones/{ctx['notif_sistema_id']}/marcar-leida",
        headers=_auth(ctx["usuario_id"]),
    )
    assert r_owner.status_code == 200
    assert r_owner.json()["leido"] is True

    r_caregiver = await client.patch(
        f"/api/v1/reminders/notificaciones/{ctx['notif_alerta_id']}/marcar-leida",
        headers=_auth(ctx["caregiver_id"]),
    )
    assert r_caregiver.status_code == 200
    assert r_caregiver.json()["leido"] is True
