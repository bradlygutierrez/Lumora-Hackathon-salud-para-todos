from lumora_api.api.v1.catalog_router import create_catalog_router
from lumora_api.models import TipoAlerta

router = create_catalog_router(prefix="/tipos-alerta", tag="Tipos de alerta", model=TipoAlerta)