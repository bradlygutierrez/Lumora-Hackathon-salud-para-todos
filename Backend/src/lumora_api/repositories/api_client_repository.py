from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from lumora_api.models.api_clients import ClaveApiCliente, ClienteApi


class ApiClientRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_clients(self) -> list[ClienteApi]:
        return list(
            await self.session.scalars(
                select(ClienteApi).order_by(ClienteApi.id)
            )
        )

    async def get_client(self, client_pk: int) -> ClienteApi | None:
        return await self.session.scalar(
            select(ClienteApi)
            .where(ClienteApi.id == client_pk)
            .options(selectinload(ClienteApi.claves))
        )

    async def get_client_by_client_id(self, client_id: str) -> ClienteApi | None:
        return await self.session.scalar(
            select(ClienteApi).where(ClienteApi.client_id == client_id)
        )

    async def create_client(self, client_id: str, nombre: str) -> ClienteApi:
        client = ClienteApi(client_id=client_id, nombre=nombre)
        self.session.add(client)
        await self.session.commit()
        await self.session.refresh(client)
        return client

    async def list_keys(self, cliente_id: int) -> list[ClaveApiCliente]:
        return list(
            await self.session.scalars(
                select(ClaveApiCliente)
                .where(ClaveApiCliente.cliente_id == cliente_id)
                .order_by(ClaveApiCliente.id)
            )
        )

    async def get_key(self, cliente_id: int, key_id: int) -> ClaveApiCliente | None:
        return await self.session.scalar(
            select(ClaveApiCliente).where(
                ClaveApiCliente.id == key_id,
                ClaveApiCliente.cliente_id == cliente_id,
            )
        )

    async def create_key(self, cliente_id: int, key_prefix: str, key_hash: str) -> ClaveApiCliente:
        key = ClaveApiCliente(cliente_id=cliente_id, key_prefix=key_prefix, key_hash=key_hash)
        self.session.add(key)
        await self.session.commit()
        await self.session.refresh(key)
        return key

    async def key_by_hash(self, key_hash: str) -> ClaveApiCliente | None:
        return await self.session.scalar(
            select(ClaveApiCliente)
            .where(ClaveApiCliente.key_hash == key_hash)
            .options(selectinload(ClaveApiCliente.cliente))
        )

    async def touch_last_used(self, key: ClaveApiCliente) -> None:
        key.last_used_at = datetime.now(timezone.utc)
        await self.session.commit()
