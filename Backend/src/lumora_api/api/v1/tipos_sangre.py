from lumora_api.api.v1.catalog_router import create_catalog_router
from lumora_api.models import TipoSangre

router = create_catalog_router(prefix="/tipos-sangre", tag="Tipos de sangre", model=TipoSangre)
