from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from lumora_api.models import ConsultaMedica, NotaClinica, SignoVital


class ConsultationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_consultations(
        self,
        limit: int,
        offset: int,
        filters: dict[str, Any],
    ) -> tuple[list[ConsultaMedica], int]:
        query = select(ConsultaMedica).where(ConsultaMedica.deleted_at.is_(None))
        count_query = select(func.count()).select_from(ConsultaMedica).where(
            ConsultaMedica.deleted_at.is_(None)
        )
        for field in ("expediente_id", "paciente_id", "profesional_id", "activo"):
            if filters.get(field) is not None:
                query = query.where(getattr(ConsultaMedica, field) == filters[field])
                count_query = count_query.where(
                    getattr(ConsultaMedica, field) == filters[field]
                )
        if filters.get("fecha_desde") is not None:
            query = query.where(ConsultaMedica.fecha_consulta >= filters["fecha_desde"])
            count_query = count_query.where(
                ConsultaMedica.fecha_consulta >= filters["fecha_desde"]
            )
        if filters.get("fecha_hasta") is not None:
            query = query.where(ConsultaMedica.fecha_consulta <= filters["fecha_hasta"])
            count_query = count_query.where(
                ConsultaMedica.fecha_consulta <= filters["fecha_hasta"]
            )
        items = list(
            await self.session.scalars(
                query.order_by(ConsultaMedica.fecha_consulta.desc(), ConsultaMedica.id.desc())
                .limit(limit)
                .offset(offset)
            )
        )
        total = await self.session.scalar(count_query)
        return items, total or 0

    async def get_consultation(self, consultation_id: int) -> ConsultaMedica | None:
        return await self.session.scalar(
            select(ConsultaMedica).where(
                ConsultaMedica.id == consultation_id,
                ConsultaMedica.deleted_at.is_(None),
            )
        )

    async def create_consultation(self, values: dict) -> ConsultaMedica:
        item = ConsultaMedica(**values)
        self.session.add(item)
        await self.session.flush()
        await self.session.refresh(item)
        return item

    async def update_consultation(
        self, item: ConsultaMedica, values: dict
    ) -> ConsultaMedica:
        for field, value in values.items():
            setattr(item, field, value)
        await self.session.flush()
        await self.session.refresh(item)
        return item

    async def soft_delete_consultation(self, item: ConsultaMedica) -> None:
        item.activo = False
        item.deleted_at = datetime.now(timezone.utc)
        await self.session.flush()

    async def list_vital_signs(
        self, consultation_id: int, limit: int, offset: int
    ) -> tuple[list[SignoVital], int]:
        query = select(SignoVital).where(SignoVital.consulta_id == consultation_id)
        items = list(
            await self.session.scalars(
                query.order_by(SignoVital.registrado_at.desc(), SignoVital.id.desc())
                .limit(limit)
                .offset(offset)
            )
        )
        total = await self.session.scalar(
            select(func.count())
            .select_from(SignoVital)
            .where(SignoVital.consulta_id == consultation_id)
        )
        return items, total or 0

    async def create_vital_signs(self, values: dict) -> SignoVital:
        item = SignoVital(**values)
        self.session.add(item)
        await self.session.flush()
        await self.session.refresh(item)
        return item

    async def list_notes(
        self, consultation_id: int, limit: int, offset: int, activo: bool | None
    ) -> tuple[list[NotaClinica], int]:
        query = select(NotaClinica).where(
            NotaClinica.consulta_id == consultation_id,
            NotaClinica.deleted_at.is_(None),
        )
        count_query = select(func.count()).select_from(NotaClinica).where(
            NotaClinica.consulta_id == consultation_id,
            NotaClinica.deleted_at.is_(None),
        )
        if activo is not None:
            query = query.where(NotaClinica.activo == activo)
            count_query = count_query.where(NotaClinica.activo == activo)
        items = list(
            await self.session.scalars(
                query.order_by(NotaClinica.created_at.desc(), NotaClinica.id.desc())
                .limit(limit)
                .offset(offset)
            )
        )
        total = await self.session.scalar(count_query)
        return items, total or 0

    async def get_note(self, consultation_id: int, note_id: int) -> NotaClinica | None:
        return await self.session.scalar(
            select(NotaClinica).where(
                NotaClinica.id == note_id,
                NotaClinica.consulta_id == consultation_id,
                NotaClinica.deleted_at.is_(None),
            )
        )

    async def create_note(self, values: dict) -> NotaClinica:
        item = NotaClinica(**values)
        self.session.add(item)
        await self.session.flush()
        await self.session.refresh(item)
        return item

    async def update_note(self, item: NotaClinica, values: dict) -> NotaClinica:
        for field, value in values.items():
            setattr(item, field, value)
        await self.session.flush()
        await self.session.refresh(item)
        return item
