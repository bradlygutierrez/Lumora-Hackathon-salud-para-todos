import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_prescription_validation_error(client: AsyncClient):
    # Intenta crear una receta con duracion_dias invalidos (<= 0)
    payload = {
        "paciente_id": 1,
        "profesional_id": 1,
        "consulta_id": None,
        "estado_id": 1,
        "observaciones": "Prueba error",
        "detalles": [
            {
                "medicamento_id": "35f4a5f3-e2ff-475e-93db-86f5c2c001a6",
                "via_administracion_id": 1,
                "unidad_medida_id": 1,
                "dosis": "500mg",
                "frecuencia": "Cada 8 horas",
                "duracion_dias": 0,  # Inválido por la regla gt=0
                "cantidad_total": -5  # Inválido por la regla gt=0
            }
        ]
    }
    response = await client.post("/api/v1/prescriptions", json=payload)
    assert response.status_code == 422  # HTTP 422 Unprocessable Entity