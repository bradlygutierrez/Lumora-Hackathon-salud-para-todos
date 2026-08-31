from datetime import time

import pytest

from lumora_api.core.security import hash_password
from lumora_api.models import (
    DetalleReceta,
    HorarioMedicamento,
    Medicamento,
    Paciente,
    Persona,
    Receta,
    RelacionPaciente,
    Rol,
    TipoRelacion,
    Usuario,
)


async def _paciente_con_horario(session_factory) -> dict:
    """Paciente con cuenta propia, una receta activa y un horario ya
    configurado -- listo para registrarle una dosis."""
    async with session_factory() as s:
        patient_role = Rol(nombre="Paciente")
        caregiver_role = Rol(nombre="Cuidador")
        tipo = TipoRelacion(nombre="Hija")
        s.add_all([patient_role, caregiver_role, tipo])
        await s.flush()

        pu = Usuario(
            persona=Persona(nombres="Rosa", apellidos="Martinez"),
            email="a13.patient@example.com",
            username="a13patient",
            password_hash=hash_password("Safe123!"),
            roles=[patient_role],
        )
        s.add(pu)
        await s.flush()

        paciente = Paciente(persona_id=pu.persona_id)
        s.add(paciente)
        await s.flush()

        medicamento = Medicamento(nombre="Losartán")
        s.add(medicamento)
        await s.flush()

        receta = Receta(paciente_id=paciente.id, profesional_id=1)
        s.add(receta)
        await s.flush()

        detalle = DetalleReceta(
            receta_id=receta.id,
            medicamento_id=medicamento.id,
            unidad_medida_id=1,
            via_administracion_id=1,
            dosis="50mg",
            frecuencia="Cada 12 horas",
            duracion_dias=30,
            cantidad_total=60,
        )
        s.add(detalle)
        await s.flush()

        horario = HorarioMedicamento(detalle_receta_id=detalle.id, hora=time(8, 0, 0))
        s.add(horario)
        await s.commit()

        return {
            "paciente_id": paciente.id,
            "horario_id": str(horario.id),
            "tipo_relacion_id": tipo.id,
            "caregiver_role_id": caregiver_role.id,
        }


async def _caregiver_headers(
    client, session_factory, ctx: dict, nivel_acceso: str, suffix: str
) -> dict:
    """Crea un cuidador con relacion activa al paciente de `ctx`, con el
    `nivel_acceso` indicado, y devuelve sus headers de autenticacion."""
    async with session_factory() as s:
        cu = Usuario(
            persona=Persona(nombres="Cuida", apellidos=f"Dor {suffix}"),
            email=f"a13.caregiver.{suffix}@example.com",
            username=f"a13caregiver{suffix}",
            password_hash=hash_password("Safe123!"),
            roles=[
                await s.get(Rol, ctx["caregiver_role_id"]),
            ],
        )
        s.add(cu)
        await s.flush()

        s.add(
            RelacionPaciente(
                paciente_id=ctx["paciente_id"],
                usuario_relacionado_id=cu.id,
                tipo_relacion_id=ctx["tipo_relacion_id"],
                estado="active",
                activo=True,
                nivel_acceso=nivel_acceso,
                recibir_notificaciones=True,
            )
        )
        await s.commit()

    login = await client.post(
        "/api/v1/auth/login",
        json={"login": f"a13caregiver{suffix}", "password": "Safe123!"},
    )
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def _dosis_payload() -> dict:
    return {
        "estado_dosis_id": 1,
        "fecha_programada": "2026-09-03T08:00:00",
        "origen_registro_id": 1,
    }


# --- Registrar dosis exige acceso de escritura ------------------------------


@pytest.mark.asyncio
async def test_cuidador_solo_lectura_no_puede_registrar_dosis(client, session_factory):
    ctx = await _paciente_con_horario(session_factory)
    headers = await _caregiver_headers(client, session_factory, ctx, "read", "ro")

    response = await client.post(
        f"/api/v1/horarios/{ctx['horario_id']}/dosis",
        json=_dosis_payload(),
        headers=headers,
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_cuidador_con_escritura_si_puede_registrar_dosis(client, session_factory):
    ctx = await _paciente_con_horario(session_factory)
    headers = await _caregiver_headers(client, session_factory, ctx, "write", "rw")

    response = await client.post(
        f"/api/v1/horarios/{ctx['horario_id']}/dosis",
        json=_dosis_payload(),
        headers=headers,
    )

    assert response.status_code == 201


# --- Actualizar el estado de una dosis tambien exige escritura --------------


@pytest.mark.asyncio
async def test_cuidador_solo_lectura_no_puede_actualizar_dosis(client, session_factory):
    ctx = await _paciente_con_horario(session_factory)
    write_headers = await _caregiver_headers(client, session_factory, ctx, "write", "rw2")
    read_headers = await _caregiver_headers(client, session_factory, ctx, "read", "ro2")

    created = await client.post(
        f"/api/v1/horarios/{ctx['horario_id']}/dosis",
        json=_dosis_payload(),
        headers=write_headers,
    )
    assert created.status_code == 201
    dosis_id = created.json()["id"]

    response = await client.patch(
        f"/api/v1/dosis/{dosis_id}",
        params={"estado_dosis_id": 2},
        headers=read_headers,
    )

    assert response.status_code == 403
