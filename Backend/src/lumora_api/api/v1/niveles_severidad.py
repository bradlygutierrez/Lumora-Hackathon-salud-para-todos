from lumora_api.api.v1.catalog_router import create_catalog_router
from lumora_api.models import NivelSeveridad

router = create_catalog_router(prefix="/niveles-severidad", tag="Niveles de severidad", model=NivelSeveridad)