from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel


class HealthAlertResponse(BaseModel):
    """A09: tarjeta unificada para la pantalla 'Alertas de Salud'.

    Junta 3 fuentes distintas (alertas clinicas reales, dosis vencidas sin
    registrar, citas proximas) bajo una sola forma que el frontend puede
    renderizar igual, pero nunca se guarda en la base de datos -- se
    calcula al momento de pedirla (ver HealthAlertsService)."""

    id: str
    tipo: Literal["alerta_clinica", "dosis_omitida", "cita_proxima"]
    categoria: Literal["alta_severidad", "preventiva", "recordatorio"]
    titulo: str
    mensaje: str
    fecha: datetime
    atendida: bool

    # Ids de contexto -- solo uno esta presente segun el "tipo", para que
    # el frontend sepa a donde navegar con cada boton de accion.
    alerta_id: Optional[UUID] = None
    medicion_id: Optional[UUID] = None
    horario_id: Optional[UUID] = None
    cita_id: Optional[int] = None
