from lumora_api.api.v1.catalog_router import create_catalog_router
from lumora_api.models import TipoRecordatorio

router = create_catalog_router(prefix="/tipos-recordatorio", tag="Tipos de recordatorio", model=TipoRecordatorio)