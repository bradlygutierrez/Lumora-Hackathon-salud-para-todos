import pytest
from httpx import AsyncClient

from lumora_api.core.security import create_access_token, hash_password
from lumora_api.models import Paciente, Persona, Rol, Usuario


@pytest.mark.asyncio
async def test_flujo_completo_tratamiento_y_monitoreo(client: AsyncClient, session_factory):
    # A09: /notificaciones/usuario/{id} ahora requiere sesion (antes no
    # tenia ningun control de acceso) -- se crea un usuario real para
    # poder autenticar esa consulta.
    async with session_factory() as s:
        usuario = Usuario(
            persona=Persona(nombres="Flujo", apellidos="Integracion"),
            email="flujo.integracion@example.com",
            username="flujointegracion",
            password_hash=hash_password("Safe123!"),
            roles=[Rol(nombre="Paciente")],
        )
        s.add(usuario)
        await s.flush()
        paciente = Paciente(persona_id=usuario.persona_id)
        s.add(paciente)
        await s.commit()
        usuario_id = usuario.id
        paciente_id = paciente.id

    # 1. Crear un recordatorio/dosis
    # A10: /recordatorios ahora tambien exige sesion y verifica acceso al
    # paciente (mismo bug de "sin control de acceso" que notificaciones
    # tenia en A09) -- se autentica con el usuario dueno del paciente.
    res_rec = await client.post(
        "/api/v1/reminders/recordatorios",
        json={
            "paciente_id": paciente_id,
            "tipo_recordatorio_id": 1,
            "titulo": "Tomar Medicamento",
            "mensaje": "1 pastilla cada 8 horas",
            "fecha_programada": "2026-08-25T10:00:00",
        },
        headers={"Authorization": f"Bearer {create_access_token(usuario_id)}"},
    )
    assert res_rec.status_code == 201

    # 2. Consultar notificaciones del usuario
    res_notif = await client.get(
        f"/api/v1/reminders/notificaciones/usuario/{usuario_id}",
        headers={"Authorization": f"Bearer {create_access_token(usuario_id)}"},
    )
    assert res_notif.status_code == 200

    # 3. Guardar preferencias del usuario (crear o actualizar)
    res_pref_patch = await client.patch(f"/api/v1/reminders/usuarios/{usuario_id}/preferencias-notificacion", json={
        "notificar_dosis": True,
        "notificar_citas": True,
        "permitir_email": True,
        "permitir_push": True
    })
    assert res_pref_patch.status_code == 200

    # 4. Consultar preferencias recién creadas
    res_pref_get = await client.get(f"/api/v1/reminders/usuarios/{usuario_id}/preferencias-notificacion")
    assert res_pref_get.status_code == 200
