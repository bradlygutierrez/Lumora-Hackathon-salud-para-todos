from fastapi import APIRouter, Query, Response, status
from lumora_api.api.dependencies import SessionDep
from lumora_api.models.catalogs import CatalogModel
from lumora_api.repositories.catalog_repository import CatalogRepository
from lumora_api.schemas import CatalogCreate, CatalogRead, CatalogUpdate, ErrorResponse, Page
from lumora_api.services.catalog_service import CatalogService

ERRORS = {
    404: {"model": ErrorResponse, "description": "Recurso no encontrado"},
    409: {"model": ErrorResponse, "description": "Conflicto de unicidad"},
}


def create_catalog_router(
    *, prefix: str, tag: str, model: type[CatalogModel]
) -> APIRouter:
    router = APIRouter(prefix=prefix, tags=[tag])

    def service(session: SessionDep) -> CatalogService:
        return CatalogService(CatalogRepository(session, model))

    @router.get("", response_model=Page[CatalogRead], summary=f"Listar {tag.lower()}")
    async def list_items(
        session: SessionDep,
        limit: int = Query(20, ge=1, le=100),
        offset: int = Query(0, ge=0),
    ) -> Page[CatalogRead]:
        items, total = await service(session).list(limit, offset)
        return Page(items=items, total=total, limit=limit, offset=offset)

    @router.post(
        "",
        response_model=CatalogRead,
        status_code=status.HTTP_201_CREATED,
        responses={409: ERRORS[409]},
        summary=f"Crear {tag.lower()}",
    )
    async def create_item(data: CatalogCreate, session: SessionDep) -> CatalogModel:
        return await service(session).create(data)

    @router.get(
        "/{item_id}",
        response_model=CatalogRead,
        responses={404: ERRORS[404]},
        summary=f"Obtener {tag.lower()}",
    )
    async def get_item(item_id: int, session: SessionDep) -> CatalogModel:
        return await service(session).get(item_id)

    @router.patch(
        "/{item_id}",
        response_model=CatalogRead,
        responses=ERRORS,
        summary=f"Actualizar {tag.lower()}",
    )
    async def update_item(
        item_id: int, data: CatalogUpdate, session: SessionDep
    ) -> CatalogModel:
        return await service(session).update(item_id, data)

    @router.delete(
        "/{item_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        responses={404: ERRORS[404]},
        summary=f"Eliminar {tag.lower()}",
    )
    async def delete_item(item_id: int, session: SessionDep) -> Response:
        await service(session).delete(item_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    return router
