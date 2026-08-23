from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from lumora_api.models.schedules import DosisAdministrada, HorarioMedicamento
from lumora_api.schemas.schedules import (
    DosisAdministradaCreate,
    HorarioMedicamentoCreate,
    HorarioMedicamentoUpdate,
)


class ScheduleService:
    @staticmethod
    async def create_horario(
        db: AsyncSession, horario_in: HorarioMedicamentoCreate
    ) -> HorarioMedicamento:
        db_horario = HorarioMedicamento(**horario_in.model_dump())
        db.add(db_horario)
        await db.commit()
        await db.refresh(db_horario)
        return db_horario

    @staticmethod
    async def get_horarios_by_detalle(
        db: AsyncSession, detalle_receta_id: str
    ) -> list[HorarioMedicamento]:
        query = select(HorarioMedicamento).where(
            HorarioMedicamento.detalle_receta_id == detalle_receta_id
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def update_horario(
        db: AsyncSession, horario_id: UUID, horario_in: HorarioMedicamentoUpdate
    ) -> HorarioMedicamento:
        query = select(HorarioMedicamento).where(HorarioMedicamento.id == horario_id)
        result = await db.execute(query)
        db_horario = result.scalar_one_or_none()

        if not db_horario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Horario de medicamento no encontrado",
            )

        update_data = horario_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_horario, field, value)

        await db.commit()
        await db.refresh(db_horario)
        return db_horario

    @staticmethod
    async def delete_horario(db: AsyncSession, horario_id: UUID) -> None:
        query = select(HorarioMedicamento).where(HorarioMedicamento.id == horario_id)
        result = await db.execute(query)
        db_horario = result.scalar_one_or_none()

        if not db_horario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Horario de medicamento no encontrado",
            )

        await db.delete(db_horario)
        await db.commit()

    @staticmethod
    async def create_dosis_log(
        db: AsyncSession, dosis_in: DosisAdministradaCreate
    ) -> DosisAdministrada:
        db_dosis = DosisAdministrada(**dosis_in.model_dump())
        db.add(db_dosis)
        await db.commit()
        await db.refresh(db_dosis)
        return db_dosis

    @staticmethod
    async def get_dosis_logs_by_horario(
        db: AsyncSession, horario_id: UUID
    ) -> list[DosisAdministrada]:
        query = select(DosisAdministrada).where(
            DosisAdministrada.horario_id == horario_id
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def update_dosis_log(
        db: AsyncSession, dosis_id: UUID, estado_dosis_id: int, observaciones: str | None = None
    ) -> DosisAdministrada:
        query = select(DosisAdministrada).where(DosisAdministrada.id == dosis_id)
        result = await db.execute(query)
        db_dosis = result.scalar_one_or_none()

        if not db_dosis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Registro de dosis no encontrado",
            )

        db_dosis.estado_dosis_id = estado_dosis_id
        if observaciones is not None:
            db_dosis.observaciones = observaciones

        await db.commit()
        await db.refresh(db_dosis)
        return db_dosis