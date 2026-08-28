from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from lumora_api.models import Paciente, Persona, Usuario


class PatientAccessRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def patient_for_user(self, user_id: int) -> Paciente | None:
        return await self.session.scalar(
            select(Paciente)
            .join(Persona, Persona.id == Paciente.persona_id)
            .join(Usuario, Usuario.persona_id == Persona.id)
            .where(
                Usuario.id == user_id,
                Usuario.activo.is_(True),
                Usuario.deleted_at.is_(None),
                Paciente.deleted_at.is_(None),
            )
        )
