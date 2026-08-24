from lumora_api.api.v1.catalog_router import create_catalog_router
from lumora_api.models import ViaAdministracion

router = create_catalog_router(prefix="/vias-administracion", tag="Vías de administración", model=ViaAdministracion)