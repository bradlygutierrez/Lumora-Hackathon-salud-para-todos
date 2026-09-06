from lumora_api.api.v1.catalog_router import create_catalog_router
from lumora_api.models import EstadoDosis

router = create_catalog_router(prefix="/estados-dosis", tag="Estados de dosis", model=EstadoDosis)