import pytest

from lumora_api.core.security import create_access_token, hash_password
from lumora_api.models import (
    Paciente,
    Persona,
    RelacionPaciente,
    Rol,
    TipoRelacion,
    Usuario,
)


async def _seed(session_factory):
    """Paciente con cuenta propia, un cuidador con relación activa (lectura)
    ya autorizado, y un tercero sin ninguna relación con ese paciente."""
    async with session_factory() as s:
        patient_role = Rol(nombre="Paciente")
        caregiver_role = Rol(nombre="Cuidador")
        tipo = TipoRelacion(nombre="Madre")
        s.add_all([patient_role, caregiver_role, tipo])
        await s.flush()

        pu = Usuario(
            persona=Persona(nombres="Ana", apellidos="Zepeda"),
            email="a11.patient@example.com",
            username="a11patient",
            password_hash=hash_password("Safe123!"),
            roles=[patient_role],
        )
        cu = Usuario(
            persona=Persona(nombres="Cuida", apellidos="Dor"),
            email="a11.caregiver@example.com",
            username="a11caregiver",
            password_hash=hash_password("Safe123!"),
            roles=[caregiver_role],
        )
        other = Usuario(
            persona=Persona(nombres="Otra", apellidos="Persona"),
            email="a11.other@example.com",
            username="a11other",
            password_hash=hash_password("Safe123!"),
            roles=[caregiver_role],
        )
        s.add_all([pu, cu, other])
        await s.flush()

        paciente = Paciente(persona_id=pu.persona_id)
        s.add(paciente)
        await s.flush()

        rel = RelacionPaciente(
            paciente_id=paciente.id,
            usuario_relacionado_id=cu.id,
            tipo_relacion_id=tipo.id,
            estado="active",
            activo=True,
            nivel_acceso="read",
            recibir_notificaciones=True,
        )
        s.add(rel)
        await s.commit()

        return {
            "paciente_id": paciente.id,
            "usuario_id": pu.id,
            "caregiver_id": cu.id,
            "other_id": other.id,
            "relacion_id": rel.id,
        }


def _auth(user_id: int) -> dict:
    return {"Authorization": f"Bearer {create_access_token(user_id)}"}


# --- Listar (alta / visibilidad) -------------------------------------------------


@pytest.mark.asyncio
async def test_listar_relaciones_paciente_ve_su_red_de_cuidado(client, session_factory):
    ctx = await _seed(session_factory)

    r = await client.get(
        f"/api/v1/reminders/pacientes/{ctx['paciente_id']}/relaciones",
        headers=_auth(ctx["usuario_id"]),
    )

    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["id"] == ctx["relacion_id"]
    assert body[0]["usuario_relacionado"]["full_name"] == "Cuida Dor"
    assert body[0]["tipo_relacion"]["nombre"] == "Madre"


@pytest.mark.asyncio
async def test_listar_relaciones_privacidad_tercero_sin_relacion_no_ve_nada(
    client, session_factory
):
    ctx = await _seed(session_factory)

    r = await client.get(
        f"/api/v1/reminders/pacientes/{ctx['paciente_id']}/relaciones",
        headers=_auth(ctx["other_id"]),
    )

    # No se confirma ni siquiera que el paciente exista.
    assert r.status_code == 404


# --- Permisos (activar/desactivar, refresco inmediato) ---------------------------


@pytest.mark.asyncio
async def test_actualizar_permisos_refleja_inmediatamente_en_el_listado(
    client, session_factory
):
    ctx = await _seed(session_factory)

    r_update = await client.patch(
        f"/api/v1/reminders/pacientes/{ctx['paciente_id']}/relaciones/{ctx['relacion_id']}",
        headers=_auth(ctx["usuario_id"]),
        json={"nivel_acceso": "write", "recibir_notificaciones": False},
    )
    assert r_update.status_code == 200
    assert r_update.json()["nivel_acceso"] == "write"
    assert r_update.json()["recibir_notificaciones"] is False

    r_list = await client.get(
        f"/api/v1/reminders/pacientes/{ctx['paciente_id']}/relaciones",
        headers=_auth(ctx["usuario_id"]),
    )
    assert r_list.status_code == 200
    assert r_list.json()[0]["nivel_acceso"] == "write"
    assert r_list.json()[0]["recibir_notificaciones"] is False


# --- Revocación --------------------------------------------------------------------


@pytest.mark.asyncio
async def test_revocar_relacion_la_saca_de_activo_y_repetir_da_conflicto(
    client, session_factory
):
    ctx = await _seed(session_factory)

    r_revoke = await client.patch(
        f"/api/v1/reminders/pacientes/{ctx['paciente_id']}/relaciones/{ctx['relacion_id']}",
        headers=_auth(ctx["usuario_id"]),
        json={"estado": "revoked"},
    )
    assert r_revoke.status_code == 200
    assert r_revoke.json()["estado"] == "revoked"
    assert r_revoke.json()["activo"] is False

    # El cuidador revocado deja de aparecer en la lista de familiares
    # autorizados (A11: "solo relaciones activas").
    r_list = await client.get(
        f"/api/v1/reminders/pacientes/{ctx['paciente_id']}/relaciones",
        headers=_auth(ctx["usuario_id"]),
    )
    assert all(item["estado"] != "active" for item in r_list.json())

    # Revocar una relación ya revocada es un conflicto, no un 200 silencioso.
    r_again = await client.patch(
        f"/api/v1/reminders/pacientes/{ctx['paciente_id']}/relaciones/{ctx['relacion_id']}",
        headers=_auth(ctx["usuario_id"]),
        json={"estado": "revoked"},
    )
    assert r_again.status_code == 409


# --- 404: relación inexistente o que no pertenece al paciente de la URL -----------


@pytest.mark.asyncio
async def test_actualizar_relacion_inexistente_da_404(client, session_factory):
    ctx = await _seed(session_factory)

    r = await client.patch(
        f"/api/v1/reminders/pacientes/{ctx['paciente_id']}/relaciones/999999",
        headers=_auth(ctx["usuario_id"]),
        json={"estado": "revoked"},
    )
    assert r.status_code == 404


# --- Privacidad: solo el propio paciente (o un admin) gestiona sus relaciones ----


@pytest.mark.asyncio
async def test_actualizar_relacion_privacidad_solo_el_paciente_dueno_puede_gestionar(
    client, session_factory
):
    ctx = await _seed(session_factory)

    # El cuidador ya autorizado puede *ver* la relación (require_access),
    # pero no puede *gestionarla* -- eso es exclusivo del paciente dueño
    # (o un admin). require_relationship_management responde 404, sin
    # confirmar que el paciente exista.
    r_caregiver = await client.patch(
        f"/api/v1/reminders/pacientes/{ctx['paciente_id']}/relaciones/{ctx['relacion_id']}",
        headers=_auth(ctx["caregiver_id"]),
        json={"estado": "revoked"},
    )
    assert r_caregiver.status_code == 404

    r_other = await client.patch(
        f"/api/v1/reminders/pacientes/{ctx['paciente_id']}/relaciones/{ctx['relacion_id']}",
        headers=_auth(ctx["other_id"]),
        json={"estado": "revoked"},
    )
    assert r_other.status_code == 404

    # La relación sigue intacta -- ninguno de los dos intentos anteriores
    # tuvo efecto.
    r_list = await client.get(
        f"/api/v1/reminders/pacientes/{ctx['paciente_id']}/relaciones",
        headers=_auth(ctx["usuario_id"]),
    )
    assert r_list.json()[0]["estado"] == "active"


# --- 422: payload inválido ----------------------------------------------------------


@pytest.mark.asyncio
async def test_actualizar_relacion_estado_invalido_da_422(client, session_factory):
    ctx = await _seed(session_factory)

    r = await client.patch(
        f"/api/v1/reminders/pacientes/{ctx['paciente_id']}/relaciones/{ctx['relacion_id']}",
        headers=_auth(ctx["usuario_id"]),
        json={"estado": "estado-que-no-existe"},
    )
    assert r.status_code == 422
