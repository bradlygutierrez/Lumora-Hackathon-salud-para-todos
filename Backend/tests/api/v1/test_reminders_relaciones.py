import pytest
from sqlalchemy import select

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
            roles=[],
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
    async with session_factory() as session:
        caregiver = await session.get(Usuario, ctx["caregiver_id"])
        assert [role.nombre for role in caregiver.roles] == ["Cuidador"]


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


# --- Buscar por correo (paso previo a "Agregar/invitar familiar") ---------------


@pytest.mark.asyncio
async def test_buscar_usuario_por_email(client, session_factory):
    ctx = await _seed(session_factory)

    r_found = await client.get(
        "/api/v1/reminders/usuarios/buscar",
        params={"email": "a11.other@example.com"},
        headers=_auth(ctx["usuario_id"]),
    )
    assert r_found.status_code == 200
    assert r_found.json()["id"] == ctx["other_id"]
    assert r_found.json()["full_name"] == "Otra Persona"

    # No se puede "encontrar" a sí mismo para añadirse como su propio familiar.
    r_self = await client.get(
        "/api/v1/reminders/usuarios/buscar",
        params={"email": "a11.patient@example.com"},
        headers=_auth(ctx["usuario_id"]),
    )
    assert r_self.status_code == 404

    r_missing = await client.get(
        "/api/v1/reminders/usuarios/buscar",
        params={"email": "no-existe@example.com"},
        headers=_auth(ctx["usuario_id"]),
    )
    assert r_missing.status_code == 404


# --- Alta: agregar/invitar familiar, y evitar duplicados -------------------------


@pytest.mark.asyncio
async def test_crear_relacion_agrega_familiar_y_evita_duplicados(client, session_factory):
    ctx = await _seed(session_factory)

    r_create = await client.post(
        f"/api/v1/reminders/pacientes/{ctx['paciente_id']}/relaciones",
        headers=_auth(ctx["usuario_id"]),
        json={
            "paciente_id": ctx["paciente_id"],
            "usuario_relacionado_id": ctx["other_id"],
            "tipo_relacion_id": 1,
        },
    )
    assert r_create.status_code == 201
    assert r_create.json()["usuario_relacionado_id"] == ctx["other_id"]
    async with session_factory() as session:
        related = await session.get(Usuario, ctx["other_id"])
        assert [role.nombre for role in related.roles] == ["Cuidador"]

    linked = await client.get(
        "/api/v1/caregivers/me/patients",
        headers=_auth(ctx["other_id"]),
    )
    assert linked.status_code == 200
    assert [item["patient_id"] for item in linked.json()["items"]] == [
        ctx["paciente_id"]
    ]

    r_list = await client.get(
        f"/api/v1/reminders/pacientes/{ctx['paciente_id']}/relaciones",
        headers=_auth(ctx["usuario_id"]),
    )
    assert len(r_list.json()) == 2

    # Agregar a la misma persona otra vez es un conflicto, no un duplicado
    # silencioso.
    r_duplicado = await client.post(
        f"/api/v1/reminders/pacientes/{ctx['paciente_id']}/relaciones",
        headers=_auth(ctx["usuario_id"]),
        json={
            "paciente_id": ctx["paciente_id"],
            "usuario_relacionado_id": ctx["other_id"],
            "tipo_relacion_id": 1,
        },
    )
    assert r_duplicado.status_code == 409


@pytest.mark.asyncio
async def test_crear_relacion_rechaza_self_link_y_usuario_inexistente(
    client, session_factory
):
    ctx = await _seed(session_factory)
    endpoint = f"/api/v1/reminders/pacientes/{ctx['paciente_id']}/relaciones"
    base = {
        "paciente_id": ctx["paciente_id"],
        "tipo_relacion_id": 1,
    }

    self_link = await client.post(
        endpoint,
        headers=_auth(ctx["usuario_id"]),
        json={**base, "usuario_relacionado_id": ctx["usuario_id"]},
    )
    missing = await client.post(
        endpoint,
        headers=_auth(ctx["usuario_id"]),
        json={**base, "usuario_relacionado_id": 999999},
    )

    assert self_link.status_code == 409
    assert missing.status_code == 404
    async with session_factory() as session:
        owner = await session.get(Usuario, ctx["usuario_id"])
        assert [role.nombre for role in owner.roles] == ["Paciente"]
        relationships = list(
            await session.scalars(
                select(RelacionPaciente).where(
                    RelacionPaciente.usuario_relacionado_id == ctx["usuario_id"]
                )
            )
        )
        assert relationships == []


@pytest.mark.asyncio
async def test_actualizar_relacion_legacy_activa_asegura_rol_cuidador(
    client, session_factory
):
    ctx = await _seed(session_factory)
    async with session_factory() as session:
        caregiver = await session.get(Usuario, ctx["caregiver_id"])
        caregiver.roles.clear()
        await session.commit()

    response = await client.patch(
        f"/api/v1/reminders/pacientes/{ctx['paciente_id']}/relaciones/{ctx['relacion_id']}",
        headers=_auth(ctx["usuario_id"]),
        json={"nivel_acceso": "write"},
    )

    assert response.status_code == 200
    async with session_factory() as session:
        caregiver = await session.get(Usuario, ctx["caregiver_id"])
        assert [role.nombre for role in caregiver.roles] == ["Cuidador"]


@pytest.mark.asyncio
async def test_patient_can_keep_patient_role_and_gain_caregiver_role(
    client, session_factory
):
    ctx = await _seed(session_factory)
    async with session_factory() as session:
        related = await session.get(Usuario, ctx["other_id"])
        patient_role = await session.scalar(select(Rol).where(Rol.nombre == "Paciente"))
        related.roles.append(patient_role)
        own_patient = Paciente(persona_id=related.persona_id)
        session.add(own_patient)
        await session.commit()
        own_patient_id = own_patient.id

    created = await client.post(
        f"/api/v1/reminders/pacientes/{ctx['paciente_id']}/relaciones",
        headers=_auth(ctx["usuario_id"]),
        json={
            "paciente_id": ctx["paciente_id"],
            "usuario_relacionado_id": ctx["other_id"],
            "tipo_relacion_id": 1,
            "nivel_acceso": "write",
        },
    )
    assert created.status_code == 201

    headers = _auth(ctx["other_id"])
    me = await client.get("/api/v1/auth/me", headers=headers)
    own_profile = await client.get("/api/v1/patients/me", headers=headers)
    linked = await client.get("/api/v1/caregivers/me/patients", headers=headers)

    assert {role["nombre"] for role in me.json()["roles"]} == {
        "Paciente",
        "Cuidador",
    }
    assert own_profile.status_code == 200
    assert own_profile.json()["patient_id"] == own_patient_id
    assert linked.status_code == 200
    assert [item["patient_id"] for item in linked.json()["items"]] == [
        ctx["paciente_id"]
    ]
