from datetime import datetime, timezone
from typing import Generic, TypeVar

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from lumora_api.models.clinical import Alergia, AntecedenteMedico, Discapacidad, Expediente
from lumora_api.models.identity import SoftDeleteMixin

ModelT = TypeVar("ModelT", bound=SoftDeleteMixin)


class ClinicalRepository(Generic[ModelT]):
    def __init__(self, session: AsyncSession, model: type[ModelT]) -> None:
        self.session = session
        self.model = model

    async def list(self, limit: int, offset: int, activo: bool | None = None):
        query = select(self.model).where(self.model.deleted_at.is_(None))
        count_query = select(func.count()).select_from(self.model).where(
            self.model.deleted_at.is_(None)
        )
        if activo is not None and hasattr(self.model, "activo"):
            query = query.where(self.model.activo == activo)
            count_query = count_query.where(self.model.activo == activo)
        items = list(
            await self.session.scalars(
                query.order_by(self.model.id).limit(limit).offset(offset)
            )
        )
        total = await self.session.scalar(count_query)
        return items, total or 0

    async def list_by_parent(
        self, field: str, parent_id: int, limit: int, offset: int, activo: bool | None
    ):
        parent_column = getattr(self.model, field)
        query = select(self.model).where(
            parent_column == parent_id, self.model.deleted_at.is_(None)
        )
        count_query = select(func.count()).select_from(self.model).where(
            parent_column == parent_id, self.model.deleted_at.is_(None)
        )
        if activo is not None:
            query = query.where(self.model.activo == activo)
            count_query = count_query.where(self.model.activo == activo)
        items = list(
            await self.session.scalars(
                query.order_by(self.model.id).limit(limit).offset(offset)
            )
        )
        total = await self.session.scalar(count_query)
        return items, total or 0

    async def get(self, item_id: int) -> ModelT | None:
        return await self.session.scalar(
            select(self.model).where(
                self.model.id == item_id, self.model.deleted_at.is_(None)
            )
        )

    async def get_by_parent(self, field: str, parent_id: int, item_id: int) -> ModelT | None:
        return await self.session.scalar(
            select(self.model).where(
                self.model.id == item_id,
                getattr(self.model, field) == parent_id,
                self.model.deleted_at.is_(None),
            )
        )

    async def active_record_for_patient(self, patient_id: int) -> Expediente | None:
        return await self.session.scalar(
            select(Expediente).where(
                Expediente.paciente_id == patient_id,
                Expediente.activo.is_(True),
                Expediente.deleted_at.is_(None),
            )
        )

    async def duplicate_history(
        self, expediente_id: int, tipo_antecedente_id: int, descripcion: str, item_id: int | None = None
    ) -> AntecedenteMedico | None:
        query = select(AntecedenteMedico).where(
            AntecedenteMedico.expediente_id == expediente_id,
            AntecedenteMedico.tipo_antecedente_id == tipo_antecedente_id,
            AntecedenteMedico.descripcion == descripcion,
            AntecedenteMedico.deleted_at.is_(None),
        )
        if item_id is not None:
            query = query.where(AntecedenteMedico.id != item_id)
        return await self.session.scalar(query)

    async def duplicate_patient_item(
        self,
        model: type[Alergia] | type[Discapacidad],
        patient_id: int,
        nombre: str,
        item_id: int | None = None,
    ):
        query = select(model).where(
            model.paciente_id == patient_id,
            model.nombre == nombre,
            model.deleted_at.is_(None),
        )
        if item_id is not None:
            query = query.where(model.id != item_id)
        return await self.session.scalar(query)

    async def create(self, values: dict) -> ModelT:
        item = self.model(**values)
        self.session.add(item)
        await self.session.flush()
        await self.session.refresh(item)
        return item

    async def update(self, item: ModelT, values: dict) -> ModelT:
        for field, value in values.items():
            setattr(item, field, value)
        await self.session.flush()
        await self.session.refresh(item)
        return item

    async def soft_delete(self, item: ModelT) -> None:
        item.activo = False
        item.deleted_at = datetime.now(timezone.utc)
        await self.session.flush()
