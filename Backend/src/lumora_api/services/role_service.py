from sqlalchemy.exc import IntegrityError

from lumora_api.core.exceptions import ResourceConflictError, ResourceNotFoundError
from lumora_api.models import Rol
from lumora_api.repositories.role_repository import RoleRepository
from lumora_api.schemas import RoleCreate, RoleUpdate
from lumora_api.services.catalog_service import CatalogService


class RoleService(CatalogService[Rol]):
    repository: RoleRepository

    async def create(self, data: RoleCreate) -> Rol:
        return await self._save(None, data)

    async def update(self, item_id: int, data: RoleUpdate) -> Rol:
        return await self._save(await self.get(item_id), data)

    async def _save(self, role: Rol | None, data: RoleCreate | RoleUpdate) -> Rol:
        values = data.model_dump(exclude_unset=True)
        permission_ids = values.pop("permiso_ids", None)
        try:
            if permission_ids is not None:
                permissions = await self.repository.permissions(permission_ids)
                if len(permissions) != len(set(permission_ids)):
                    raise ResourceNotFoundError("Uno o más permisos no existen")
            if role is None:
                role = await self.repository.create(values)
            else:
                role = await self.repository.update(role, values)
            if permission_ids is not None:
                role.permisos = permissions
            await self.repository.session.commit()
            return role
        except IntegrityError as error:
            await self.repository.session.rollback()
            raise ResourceConflictError("Ya existe un rol con ese nombre") from error
