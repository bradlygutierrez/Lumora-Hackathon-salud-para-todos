from typing import Annotated, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field


Name = Annotated[str, Field(min_length=1, max_length=100, examples=["Administrador"])]


class CatalogCreate(BaseModel):
    nombre: Name


class CatalogUpdate(BaseModel):
    nombre: Name | None = None


class CatalogRead(BaseModel):
    id: int
    nombre: str

    model_config = ConfigDict(from_attributes=True)


class ActiveCatalogCreate(CatalogCreate):
    activo: bool = True


class ActiveCatalogUpdate(CatalogUpdate):
    activo: bool | None = None


class ActiveCatalogRead(CatalogRead):
    activo: bool


class PermissionRead(CatalogRead):
    descripcion: str | None = None


class RoleCreate(CatalogCreate):
    descripcion: str | None = Field(default=None, max_length=500)
    permiso_ids: list[int] = Field(default_factory=list)


class RoleUpdate(CatalogUpdate):
    descripcion: str | None = Field(default=None, max_length=500)
    permiso_ids: list[int] | None = None


class RoleRead(CatalogRead):
    descripcion: str | None = None
    permisos: list[PermissionRead] = Field(default_factory=list)


ItemT = TypeVar("ItemT")


class Page(BaseModel, Generic[ItemT]):
    items: list[ItemT]
    total: int
    limit: int
    offset: int


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorDetail
