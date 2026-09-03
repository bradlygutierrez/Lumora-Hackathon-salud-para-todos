import json
import logging
import sys
from datetime import datetime, timezone

from lumora_api.core.config import get_settings

logger = logging.getLogger("lumora_api")

# Campos de contexto seguro que sí se registran. Nunca se pasan headers,
# body de la petición ni objetos de dominio completos a `extra=`, para no
# arrastrar Authorization, refresh tokens, API keys, contraseñas ni datos
# clínicos a los logs.
_CONTEXT_FIELDS = ("request_id", "method", "path", "status_code", "duration_ms", "client_ip")


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "environment": get_settings().environment,
        }
        for field in _CONTEXT_FIELDS:
            value = getattr(record, field, None)
            if value is not None:
                payload[field] = value
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_logging() -> None:
    """Logging estructurado en JSON por stdout, listo para que el
    proveedor de hosting agregue logs por línea sin parseo adicional."""
    if logger.handlers:
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False
