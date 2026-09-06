import pytest

from helpers.medical import create_active_medical_professional

from lumora_api.core.security import hash_password
from lumora_api.models import DetalleReceta, Medicamento, Permiso, Persona, Receta, Rol, Usuario


async def _receta_with_detalle(session_factory) -> str:
    async with session_factory() as session:
        medicamento = Medicamento(nombre="Losartán")
        session.add(medicamento)
        await session.flush()
        receta = Receta(paciente_id=1, profesional_id=1)
        session.add(receta)
        await session.flush()
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
        session.add(detalle)
        await session.commit()
        return detalle.id


async def _staff_headers(client, session_factory) -> dict:
    async with session_factory() as session:
        user = Usuario(
            persona=Persona(nombres="Doc", apellidos="Staff"),
            email="doc2@example.com",
            username="doc2",
            password_hash=hash_password("safe-password"),
        )
        session.add(user)
        await session.flush()
        await create_active_medical_professional(session, user=user, username="doc2")
        await session.commit()
    login = await client.post(
        "/api/v1/auth/login", json={"login": "doc2", "password": "safe-password"}
    )
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


async def _patient_headers(client, session_factory) -> dict:
    async with session_factory() as session:
        session.add(
            Usuario(
                persona=Persona(nombres="Pac", apellidos="Simple"),
                email="pac2@example.com",
                username="pac2",
                password_hash=hash_password("safe-password"),
                roles=[Rol(nombre="Paciente")],
            )
        )
        await session.commit()
    login = await client.post(
        "/api/v1/auth/login", json={"login": "pac2", "password": "safe-password"}
    )
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


@pytest.mark.asyncio
async def test_horarios_require_authentication(client):
    response = await client.get("/api/v1/recetas/cualquiera/horarios")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_only_staff_can_create_horario(client, session_factory):
    detalle_id = await _receta_with_detalle(session_factory)
    headers = await _patient_headers(client, session_factory)

    response = await client.post(
        f"/api/v1/recetas/{detalle_id}/horarios",
        # detalle_receta_id NO va en el body -- lo toma del path, igual que
        # manda el cliente real de HealthStaff (ver
        # test_staff_can_create_and_list_horario para la regresión de este
        # caso: mandarlo era obligatorio antes y provocaba un 422).
        json={"hora": "08:00:00"},
        headers=headers,
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_staff_can_create_and_list_horario(client, session_factory):
    detalle_id = await _receta_with_detalle(session_factory)
    headers = await _staff_headers(client, session_factory)

    # HealthStaff nunca manda detalle_receta_id en el body (lo toma del
    # path) -- HorarioMedicamentoCreate.detalle_receta_id debe ser
    # opcional o esto responde 422 en vez de 201.
    created = await client.post(
        f"/api/v1/recetas/{detalle_id}/horarios",
        json={"hora": "08:00:00"},
        headers=headers,
    )
    assert created.status_code == 201
    assert created.json()["detalle_receta_id"] == detalle_id

    listed = await client.get(f"/api/v1/recetas/{detalle_id}/horarios", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    # Si un caller SÍ lo manda en el body, se ignora y se usa el del path
    # de todas formas (no hay forma de crear un horario "ajeno" a otra
    # receta por esta vía).
    with_body_id = await client.post(
        f"/api/v1/recetas/{detalle_id}/horarios",
        json={"hora": "09:00:00", "detalle_receta_id": "otra-receta-cualquiera"},
        headers=headers,
    )
    assert with_body_id.status_code == 201
    assert with_body_id.json()["detalle_receta_id"] == detalle_id
