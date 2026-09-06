from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from lumora_api.models import CondicionMedica, Diagnostico, HistorialCondicion


class DiagnosisRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_diagnoses(self, consultation_id: int, limit: int, offset: int):
        query = select(Diagnostico).where(
            Diagnostico.consulta_id == consultation_id,
            Diagnostico.deleted_at.is_(None),
        )
        items = list(
            await self.session.scalars(query.order_by(Diagnostico.id).limit(limit).offset(offset))
        )
        total = await self.session.scalar(
            select(func.count()).select_from(Diagnostico).where(
                Diagnostico.consulta_id == consultation_id,
                Diagnostico.deleted_at.is_(None),
            )
        )
        return items, total or 0

    async def get_diagnosis(self, diagnosis_id: int) -> Diagnostico | None:
        return await self.session.scalar(
            select(Diagnostico).where(
                Diagnostico.id == diagnosis_id, Diagnostico.deleted_at.is_(None)
            )
        )

    async def create_diagnosis(self, values: dict) -> Diagnostico:
        item = Diagnostico(**values)
        self.session.add(item)
        await self.session.flush()
        await self.session.refresh(item)
        return item

    async def update_diagnosis(self, item: Diagnostico, values: dict) -> Diagnostico:
        for field, value in values.items():
            setattr(item, field, value)
        await self.session.flush()
        await self.session.refresh(item)
        return item

    async def soft_delete_diagnosis(self, item: Diagnostico) -> None:
        item.activo = False
        item.deleted_at = datetime.now(timezone.utc)
        await self.session.flush()

    async def list_conditions(self, record_id: int, limit: int, offset: int, activo: bool | None):
        query = select(CondicionMedica).where(
            CondicionMedica.expediente_id == record_id,
            CondicionMedica.deleted_at.is_(None),
        )
        count_query = select(func.count()).select_from(CondicionMedica).where(
            CondicionMedica.expediente_id == record_id,
            CondicionMedica.deleted_at.is_(None),
        )
        if activo is not None:
            query = query.where(CondicionMedica.activo == activo)
            count_query = count_query.where(CondicionMedica.activo == activo)
        items = list(
            await self.session.scalars(query.order_by(CondicionMedica.id).limit(limit).offset(offset))
        )
        total = await self.session.scalar(count_query)
        return items, total or 0

    async def get_condition(self, condition_id: int) -> CondicionMedica | None:
        return await self.session.scalar(
            select(CondicionMedica).where(
                CondicionMedica.id == condition_id,
                CondicionMedica.deleted_at.is_(None),
            )
        )

    async def duplicate_condition(self, record_id: int, nombre: str, item_id: int | None = None):
        query = select(CondicionMedica).where(
            CondicionMedica.expediente_id == record_id,
            CondicionMedica.nombre == nombre,
            CondicionMedica.deleted_at.is_(None),
        )
        if item_id is not None:
            query = query.where(CondicionMedica.id != item_id)
        return await self.session.scalar(query)

    async def create_condition(self, values: dict) -> CondicionMedica:
        item = CondicionMedica(**values)
        self.session.add(item)
        await self.session.flush()
        await self.session.refresh(item)
        return item

    async def update_condition(self, item: CondicionMedica, values: dict) -> CondicionMedica:
        for field, value in values.items():
            setattr(item, field, value)
        await self.session.flush()
        await self.session.refresh(item)
        return item

    async def soft_delete_condition(self, item: CondicionMedica) -> None:
        item.activo = False
        item.deleted_at = datetime.now(timezone.utc)
        await self.session.flush()

    async def add_history(self, values: dict) -> HistorialCondicion:
        item = HistorialCondicion(**values)
        self.session.add(item)
        await self.session.flush()
        await self.session.refresh(item)
        return item

    async def list_history(self, condition_id: int, limit: int, offset: int):
        query = select(HistorialCondicion).where(
            HistorialCondicion.condicion_id == condition_id
        )
        items = list(
            await self.session.scalars(
                query.order_by(HistorialCondicion.created_at, HistorialCondicion.id)
                .limit(limit)
                .offset(offset)
            )
        )
        total = await self.session.scalar(
            select(func.count())
            .select_from(HistorialCondicion)
            .where(HistorialCondicion.condicion_id == condition_id)
        )
        return items, total or 0
