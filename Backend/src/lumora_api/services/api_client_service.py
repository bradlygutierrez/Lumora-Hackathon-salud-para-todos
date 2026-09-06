from datetime import datetime, timezone

from lumora_api.core.exceptions import ResourceConflictError, ResourceNotFoundError
from lumora_api.core.security import generate_token, hash_token
from lumora_api.models.api_clients import ClaveApiCliente, ClienteApi
from lumora_api.repositories.api_client_repository import ApiClientRepository

KEY_PREFIX_LENGTH = 12


def _generate_raw_key() -> str:
    return f"lumk_{generate_token()}"


class ApiClientService:
    def __init__(self, repository: ApiClientRepository) -> None:
        self.repository = repository

    async def list_clients(self) -> list[ClienteApi]:
        return await self.repository.list_clients()

    async def get_client(self, client_pk: int) -> ClienteApi:
        client = await self.repository.get_client(client_pk)
        if client is None:
            raise ResourceNotFoundError("Cliente API no encontrado")
        return client

    async def create_client(self, client_id: str, nombre: str) -> ClienteApi:
        if await self.repository.get_client_by_client_id(client_id) is not None:
            raise ResourceConflictError("Ya existe un cliente API con ese client_id")
        return await self.repository.create_client(client_id, nombre)

    async def update_client(
        self, client_pk: int, *, nombre: str | None = None, activo: bool | None = None
    ) -> ClienteApi:
        client = await self.get_client(client_pk)
        if nombre is not None:
            client.nombre = nombre
        if activo is not None:
            client.activo = activo
        await self.repository.session.commit()
        await self.repository.session.refresh(client)
        return client

    async def list_keys(self, client_pk: int) -> list[ClaveApiCliente]:
        await self.get_client(client_pk)
        return await self.repository.list_keys(client_pk)

    async def issue_key(self, client_pk: int) -> tuple[ClaveApiCliente, str]:
        await self.get_client(client_pk)
        raw_key = _generate_raw_key()
        key = await self.repository.create_key(
            client_pk, raw_key[:KEY_PREFIX_LENGTH], hash_token(raw_key)
        )
        return key, raw_key

    async def revoke_key(self, client_pk: int, key_id: int) -> ClaveApiCliente:
        key = await self.repository.get_key(client_pk, key_id)
        if key is None:
            raise ResourceNotFoundError("Clave de API no encontrada")
        key.activa = False
        key.revoked_at = datetime.now(timezone.utc)
        await self.repository.session.commit()
        await self.repository.session.refresh(key)
        return key

    async def resolve(self, raw_key: str) -> ClienteApi | None:
        key = await self.repository.key_by_hash(hash_token(raw_key))
        if key is None or not key.activa or not key.cliente.activo:
            return None
        await self.repository.touch_last_used(key)
        return key.cliente
