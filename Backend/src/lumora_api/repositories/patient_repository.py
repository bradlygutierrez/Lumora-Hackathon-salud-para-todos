from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from lumora_api.models import Paciente, Persona, RelacionPaciente, Usuario
from lumora_api.repositories.identity_repository import IdentityRepository


class PatientRepository(IdentityRepository[Paciente]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Paciente)

    async def list_filtered(
        self,
        *,
        search: str | None,
        sexo_id: int | None,
        tipo_sangre_id: int | None,
        limit: int,
        offset: int,
    ) -> tuple[list[Paciente], int]:
        conditions = [Paciente.deleted_at.is_(None), Persona.deleted_at.is_(None)]
        if search and search.strip():
            term = f"%{search.strip().lower()}%"
            full_name = func.lower(Persona.nombres + " " + Persona.apellidos)
            conditions.append(
                or_(
                    full_name.like(term),
                    func.lower(func.coalesce(Persona.telefono, "")).like(term),
                    func.lower(func.coalesce(Persona.email, "")).like(term),
                )
            )
        if sexo_id is not None:
            conditions.append(Persona.sexo_id == sexo_id)
        if tipo_sangre_id is not None:
            conditions.append(Paciente.tipo_sangre_id == tipo_sangre_id)

        query = (
            select(Paciente)
            .join(Persona, Persona.id == Paciente.persona_id)
            .where(*conditions)
            .options(
                selectinload(Paciente.persona).selectinload(Persona.direcciones),
                selectinload(Paciente.contactos_emergencia),
            )
            .order_by(Persona.apellidos, Persona.nombres, Paciente.id)
        )
        items = list(await self.session.scalars(query.limit(limit).offset(offset)))
        total = await self.session.scalar(
            select(func.count())
            .select_from(Paciente)
            .join(Persona, Persona.id == Paciente.persona_id)
            .where(*conditions)
        )
        return items, total or 0

    async def get_by_persona_id(self, persona_id: int) -> Paciente | None:
        return await self.session.scalar(
            select(Paciente)
            .where(
                Paciente.persona_id == persona_id,
                Paciente.deleted_at.is_(None),
            )
            .options(
                selectinload(Paciente.persona).selectinload(Persona.direcciones),
                selectinload(Paciente.contactos_emergencia),
            )
        )

    async def get(self, item_id: int) -> Paciente | None:
        return await self.session.scalar(
            select(Paciente)
            .where(Paciente.id == item_id, Paciente.deleted_at.is_(None))
            .options(
                selectinload(Paciente.persona).selectinload(Persona.direcciones),
                selectinload(Paciente.contactos_emergencia),
            )
        )

    async def family_relationships(self, patient_id: int) -> list[RelacionPaciente]:
        return list(
            await self.session.scalars(
                select(RelacionPaciente)
                .where(
                    RelacionPaciente.paciente_id == patient_id,
                    RelacionPaciente.activo.is_(True),
                )
                .options(
                    selectinload(RelacionPaciente.usuario_relacionado).selectinload(Usuario.persona),
                    selectinload(RelacionPaciente.tipo_relacion),
                )
                .order_by(RelacionPaciente.id)
            )
        )
