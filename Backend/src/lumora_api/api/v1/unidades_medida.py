from lumora_api.api.v1.catalog_router import create_catalog_router
from lumora_api.models import UnidadMedida

router = create_catalog_router(prefix="/unidades-medida", tag="Unidades de medida", model=UnidadMedida)