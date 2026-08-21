from lumora_api.api.v1.catalog_router import create_catalog_router
from lumora_api.models import EstadoCita

router = create_catalog_router(prefix="/estados-cita", tag="Estados de cita", model=EstadoCita)
