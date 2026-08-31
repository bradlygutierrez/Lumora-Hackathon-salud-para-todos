from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from lumora_api.core.exceptions import ResourceNotFoundError
from lumora_api.models.identity import Usuario
from lumora_api.models.prescriptions import DetalleReceta, Receta
from lumora_api.models.schedules import DosisAdministrada, HorarioMedicamento
from lumora_api.schemas.schedules import (
    DosisAdministradaCreate,
    HorarioMedicamentoCreate,
    HorarioMedicamentoUpdate,
)
from lumora_api.services.authorization import ensure_can_access_patient_data


class ScheduleService:
    # --- Apoyo para autorización: a quién pertenece cada recurso ---
    @staticmethod
    async def _paciente_id_for_detalle(db: AsyncSession, detalle_receta_id: str) -> int | None:
        query = (
            select(Receta.paciente_id)
            .join(DetalleReceta, DetalleReceta.receta_id == Receta.id)
            .where(DetalleReceta.id == detalle_receta_id)
        )
        return await db.scalar(query)

    @staticmethod
    async def _paciente_id_for_horario(db: AsyncSession, horario_id: UUID) -> int | None:
        query = (
            select(Receta.paciente_id)
            .join(DetalleReceta, DetalleReceta.receta_id == Receta.id)
            .join(HorarioMedicamento, HorarioMedicamento.detalle_receta_id == DetalleReceta.id)
            .where(HorarioMedicamento.id == horario_id)
        )
        return await db.scalar(query)

    # --- HORARIOS ---
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
        db: AsyncSession, current_user: Usuario, detalle_receta_id: str
    ) -> list[HorarioMedicamento]:
        paciente_id = await ScheduleService._paciente_id_for_detalle(db, detalle_receta_id)
        await ensure_can_access_patient_data(db, current_user, paciente_id)
        query = select(HorarioMedicamento).where(
            HorarioMedicamento.detalle_receta_id == detalle_receta_id
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def update_horario(
        db: AsyncSession, horario_id: UUID, horario_in: HorarioMedicamentoUpdate
    ) -> HorarioMedicamento:
        db_horario = await db.get(HorarioMedicamento, horario_id)
        if not db_horario:
            raise ResourceNotFoundError("Horario de medicamento no encontrado")

        update_data = horario_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_horario, field, value)

        await db.commit()
        await db.refresh(db_horario)
        return db_horario

    @staticmethod
    async def delete_horario(db: AsyncSession, horario_id: UUID) -> None:
        db_horario = await db.get(HorarioMedicamento, horario_id)
        if not db_horario:
            raise ResourceNotFoundError("Horario de medicamento no encontrado")

        await db.delete(db_horario)
        await db.commit()

    # --- DOSIS ---
    @staticmethod
    async def create_dosis_log(
        db: AsyncSession, current_user: Usuario, dosis_in: DosisAdministradaCreate
    ) -> DosisAdministrada:
        paciente_id = await ScheduleService._paciente_id_for_horario(db, dosis_in.horario_id)
        if paciente_id is None:
            raise ResourceNotFoundError("Horario de medicamento no encontrado")
        # Registrar una dosis es una mutacion -- un cuidador con acceso de
        # solo lectura no puede marcarla como tomada (A13).
        await ensure_can_access_patient_data(db, current_user, paciente_id, action="write")
        db_dosis = DosisAdministrada(**dosis_in.model_dump())
        db.add(db_dosis)
        await db.commit()
        await db.refresh(db_dosis)
        return db_dosis

    @staticmethod
    async def get_dosis_logs_by_horario(
        db: AsyncSession, current_user: Usuario, horario_id: UUID
    ) -> list[DosisAdministrada]:
        paciente_id = await ScheduleService._paciente_id_for_horario(db, horario_id)
        await ensure_can_access_patient_data(db, current_user, paciente_id)
        query = select(DosisAdministrada).where(
            DosisAdministrada.horario_id == horario_id
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def update_dosis_log(
        db: AsyncSession,
        current_user: Usuario,
        dosis_id: UUID,
        estado_dosis_id: int,
        observaciones: str | None = None,
    ) -> DosisAdministrada:
        db_dosis = await db.get(DosisAdministrada, dosis_id)
        if not db_dosis:
            raise ResourceNotFoundError("Registro de dosis no encontrado")

        paciente_id = await ScheduleService._paciente_id_for_horario(db, db_dosis.horario_id)
        # Cambiar el estado de una dosis (posponer/omitir/etc.) tambien es
        # una mutacion -- misma regla que crear el registro (A13).
        await ensure_can_access_patient_data(db, current_user, paciente_id, action="write")

        db_dosis.estado_dosis_id = estado_dosis_id
        if observaciones is not None:
            db_dosis.observaciones = observaciones

        await db.commit()
        await db.refresh(db_dosis)
        return db_dosis
