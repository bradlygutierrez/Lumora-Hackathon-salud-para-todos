import pytest

from lumora_api.core.security import create_access_token, hash_password
from lumora_api.models import (
    AlertaClinica,
    IndicadorMedico,
    MedicionIndicador,
    NivelSeveridad,
    Paciente,
    Persona,
    Rol,
    UnidadMedida,
    Usuario,
)


async def _seed(session_factory):
    """Paciente con una alerta clinica real pendiente, y un tercero sin
    relacion con el paciente."""
    async with session_factory() as s:
        patient_role = Rol(nombre="Paciente")
        s.add(patient_role)
        await s.flush()

        pu = Usuario(
            persona=Persona(nombres="Ana", apellidos="Paciente"),
            email="ha.patient@example.com",
            username="hapatient",
            password_hash=hash_password("Safe123!"),
            roles=[patient_role],
        )
        other = Usuario(
            persona=Persona(nombres="Otra", apellidos="Persona"),
            email="ha.other@example.com",
            username="haother",
            password_hash=hash_password("Safe123!"),
            roles=[patient_role],
        )
        s.add_all([pu, other])
        await s.flush()

        paciente = Paciente(persona_id=pu.persona_id)
        s.add(paciente)
        await s.flush()

        unidad = UnidadMedida(nombre="mmHg")
        nivel = NivelSeveridad(nombre="Alta")
        s.add_all([unidad, nivel])
        await s.flush()

        indicador = IndicadorMedico(
            codigo="PA_API", nombre="Presión Arterial", unidad_medida_id=unidad.id
        )
        s.add(indicador)
        await s.flush()

        medicion = MedicionIndicador(
            paciente_id=paciente.id,
            indicador_id=indicador.id,
            valor=150,
            unidad_medida_id=unidad.id,
            origen_registro_id=1,
            registrado_por_id=pu.id,
        )
        s.add(medicion)
        await s.flush()

        s.add(
            AlertaClinica(
                paciente_id=paciente.id,
                medicion_id=medicion.id,
                nivel_severidad_id=nivel.id,
                tipo_alerta_id=1,
                origen_registro_id=1,
                mensaje="Fuera de rango.",
            )
        )
        await s.commit()

        return {
            "paciente_id": paciente.id,
            "usuario_id": pu.id,
            "other_id": other.id,
        }


def _auth(user_id: int) -> dict:
    return {"Authorization": f"Bearer {create_access_token(user_id)}"}


@pytest.mark.asyncio
async def test_listar_alertas_de_salud_permite_al_paciente_y_deniega_a_terceros(
    client, session_factory
):
    ctx = await _seed(session_factory)

    r_owner = await client.get(
        f"/api/v1/health-alerts/patients/{ctx['paciente_id']}",
        headers=_auth(ctx["usuario_id"]),
    )
    assert r_owner.status_code == 200
    body = r_owner.json()
    assert len(body) == 1
    assert body[0]["tipo"] == "alerta_clinica"
    assert body[0]["categoria"] == "alta_severidad"

    r_denied = await client.get(
        f"/api/v1/health-alerts/patients/{ctx['paciente_id']}",
        headers=_auth(ctx["other_id"]),
    )
    assert r_denied.status_code == 404
