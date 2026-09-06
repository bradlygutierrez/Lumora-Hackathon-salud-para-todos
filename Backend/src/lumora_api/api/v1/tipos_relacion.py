from lumora_api.api.v1.catalog_router import create_catalog_router
from lumora_api.models import TipoRelacion

router = create_catalog_router(prefix="/tipos-relacion", tag="Tipos de relación", model=TipoRelacion)