from lumora_api.api.v1.catalog_router import create_catalog_router
from lumora_api.models import OrigenRegistro

router = create_catalog_router(prefix="/origenes-registro", tag="Orígenes de registro", model=OrigenRegistro)