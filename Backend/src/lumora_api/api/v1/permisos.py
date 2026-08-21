from fastapi import APIRouter, Query

from lumora_api.api.dependencies import SessionDep
from lumora_api.models import Permiso
from lumora_api.repositories.catalog_repository import CatalogRepository
from lumora_api.schemas import Page, PermissionRead
from lumora_api.services.catalog_service import CatalogService

router = APIRouter(prefix="/permisos", tags=["Permisos"])


@router.get("", response_model=Page[PermissionRead], summary="Listar permisos")
async def list_permissions(
    session: SessionDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> Page[PermissionRead]:
    items, total = await CatalogService(
        CatalogRepository(session, Permiso)
    ).list(limit, offset)
    return Page(items=items, total=total, limit=limit, offset=offset)
