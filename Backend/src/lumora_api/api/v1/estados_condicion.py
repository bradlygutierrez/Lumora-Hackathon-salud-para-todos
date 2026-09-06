from lumora_api.api.v1.catalog_router import create_catalog_router
from lumora_api.models import EstadoCondicion
from lumora_api.schemas import ActiveCatalogCreate, ActiveCatalogRead, ActiveCatalogUpdate

router = create_catalog_router(
    prefix="/estados-condicion",
    tag="Estados de condicion",
    model=EstadoCondicion,
    create_schema=ActiveCatalogCreate,
    update_schema=ActiveCatalogUpdate,
    read_schema=ActiveCatalogRead,
    filter_by_active=True,
)
