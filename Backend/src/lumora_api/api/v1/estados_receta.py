from lumora_api.api.v1.catalog_router import create_catalog_router
from lumora_api.models import EstadoReceta

router = create_catalog_router(prefix="/estados-receta", tag="Estados de receta", model=EstadoReceta)