from lumora_api.api.v1.catalog_router import create_catalog_router
from lumora_api.models import TipoCita

router = create_catalog_router(prefix="/tipos-cita", tag="Tipos de cita", model=TipoCita)
