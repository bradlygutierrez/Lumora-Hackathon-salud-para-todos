import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_flujo_completo_tratamiento_y_monitoreo(client: AsyncClient):
    # 1. Crear un recordatorio/dosis
    res_rec = await client.post("/api/v1/reminders/recordatorios", json={
        "paciente_id": 1,
        "tipo_recordatorio_id": 1,
        "titulo": "Tomar Medicamento",
        "mensaje": "1 pastilla cada 8 horas",
        "fecha_programada": "2026-08-25T10:00:00"
    })
    assert res_rec.status_code == 201

    # 2. Consultar notificaciones del usuario
    res_notif = await client.get("/api/v1/reminders/notificaciones/usuario/1")
    assert res_notif.status_code == 200

    # 3. Guardar preferencias del usuario (crear o actualizar)
    res_pref_patch = await client.patch("/api/v1/reminders/usuarios/1/preferencias-notificacion", json={
        "notificar_dosis": True,
        "notificar_citas": True,
        "permitir_email": True,
        "permitir_push": True
    })
    assert res_pref_patch.status_code == 200

    # 4. Consultar preferencias recién creadas
    res_pref_get = await client.get("/api/v1/reminders/usuarios/1/preferencias-notificacion")
    assert res_pref_get.status_code == 200