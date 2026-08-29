import pytest
from httpx import AsyncClient

# A10: el caso de "crear y listar un recordatorio" ahora exige
# autenticacion y verifica acceso al paciente -- se movio, ya cubierto
# (junto con permisos de cuidador/tercero) en
# tests/api/v1/test_reminders_recordatorios.py.


@pytest.mark.asyncio
async def test_obtener_y_actualizar_preferencias(client: AsyncClient):
    payload = {
        "notificar_dosis": True,
        "notificar_citas": False,
        "permitir_email": True,
        "permitir_push": True
    }
    
    # Actualizar preferencias de usuario
    response = await client.patch("/api/v1/reminders/usuarios/1/preferencias-notificacion", json=payload)
    assert response.status_code == 200
    assert response.json()["notificar_citas"] is False

    # Consultar preferencias
    response_get = await client.get("/api/v1/reminders/usuarios/1/preferencias-notificacion")
    assert response_get.status_code == 200
    assert response_get.json()["usuario_id"] == 1