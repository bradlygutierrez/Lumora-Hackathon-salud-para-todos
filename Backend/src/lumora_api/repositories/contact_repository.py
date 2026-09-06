from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from lumora_api.models import ContactoEmergencia
from lumora_api.repositories.identity_repository import IdentityRepository


class ContactRepository(IdentityRepository[ContactoEmergencia]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, ContactoEmergencia)

    async def list_for_patient(
        self, patient_id: int, limit: int, offset: int
    ) -> tuple[list[ContactoEmergencia], int]:
        condition = (
            ContactoEmergencia.paciente_id == patient_id,
            ContactoEmergencia.deleted_at.is_(None),
        )
        items = list(
            await self.session.scalars(
                select(ContactoEmergencia)
                .where(*condition)
                .order_by(ContactoEmergencia.id)
                .limit(limit)
                .offset(offset)
            )
        )
        total = await self.session.scalar(
            select(func.count()).select_from(ContactoEmergencia).where(*condition)
        )
        return items, total or 0
