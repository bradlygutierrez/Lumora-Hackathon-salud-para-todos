import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_crear_y_listar_recordatorio(client: AsyncClient):
    payload = {
        "paciente_id": 1,
        "tipo_recordatorio_id": 1,
        "titulo": "Tomar Paracetamol",
        "mensaje": "Tomar 1 pastilla cada 8 horas",
        "fecha_programada": "2026-08-25T08:00:00"
    }
    
    # Crear recordatorio
    response = await client.post("/api/v1/reminders/recordatorios", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["titulo"] == "Tomar Paracetamol"
    assert "id" in data

    # Listar recordatorios del paciente
    response_list = await client.get("/api/v1/reminders/recordatorios/paciente/1")
    assert response_list.status_code == 200
    assert len(response_list.json()) > 0


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