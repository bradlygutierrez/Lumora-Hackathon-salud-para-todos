from lumora_api.api.v1.catalog_router import create_catalog_router
from lumora_api.models import Sexo

router = create_catalog_router(prefix="/sexos", tag="Sexos", model=Sexo)
