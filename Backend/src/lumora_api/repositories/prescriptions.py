from typing import Optional, Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from lumora_api.models.prescriptions import Medicamento, Receta, DetalleReceta
from lumora_api.schemas.prescriptions import (
    MedicamentoCreate, 
    MedicamentoUpdate, 
    RecetaCreate, 
    RecetaUpdate,
    DetalleRecetaCreate,
    DetalleRecetaUpdate
)


class PrescriptionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    # --- MEDICAMENTOS ---
    async def create_medicamento(self, schema: MedicamentoCreate) -> Medicamento:
        medicamento = Medicamento(**schema.model_dump())
        self.session.add(medicamento)
        await self.session.commit()
        await self.session.refresh(medicamento)
        return medicamento

    async def get_medicamento_by_id(self, medicamento_id: str) -> Optional[Medicamento]:
        query = select(Medicamento).where(Medicamento.id == medicamento_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_medicamentos(self, limit: int = 100, offset: int = 0) -> Sequence[Medicamento]:
        query = select(Medicamento).offset(offset).limit(limit)
        result = await self.session.execute(query)
        return result.scalars().all()

    async def update_medicamento(self, medicamento: Medicamento, schema: MedicamentoUpdate) -> Medicamento:
        update_data = schema.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(medicamento, key, value)
        await self.session.commit()
        await self.session.refresh(medicamento)
        return medicamento

    async def delete_medicamento(self, medicamento: Medicamento) -> None:
        await self.session.delete(medicamento)
        await self.session.commit()

    # --- RECETAS ---
    async def create_receta(self, schema: RecetaCreate) -> Receta:
        receta_data = schema.model_dump(exclude={"detalles"})
        receta = Receta(**receta_data)
        
        for detalle_data in schema.detalles:
            detalle = DetalleReceta(**detalle_data.model_dump())
            receta.detalles.append(detalle)

        self.session.add(receta)
        await self.session.commit()
        # "profesional" se incluye aquí (y no solo "detalles") porque
        # RecetaResponse ahora anida los datos del profesional; sin
        # refrescarlo, el primer acceso ocurriría durante la serialización
        # de la respuesta y no dentro de un await de SQLAlchemy.
        await self.session.refresh(receta, attribute_names=["detalles", "profesional"])
        return receta

    async def get_receta_by_id(self, receta_id: str) -> Optional[Receta]:
        query = (
            select(Receta)
            .options(selectinload(Receta.detalles))
            .where(Receta.id == receta_id)
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_recetas_by_paciente(self, paciente_id: int) -> Sequence[Receta]:
        query = (
            select(Receta)
            .options(selectinload(Receta.detalles))
            .where(Receta.paciente_id == paciente_id)
        )
        result = await self.session.execute(query)
        return result.scalars().all()

    async def update_receta(self, receta: Receta, schema: RecetaUpdate) -> Receta:
        update_data = schema.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(receta, key, value)
        await self.session.commit()
        await self.session.refresh(receta, attribute_names=["detalles", "profesional"])
        return receta

    # --- DETALLES DE RECETA ---
    async def create_detalle(self, receta_id: str, schema: DetalleRecetaCreate) -> DetalleReceta:
        detalle = DetalleReceta(receta_id=receta_id, **schema.model_dump())
        self.session.add(detalle)
        await self.session.commit()
        await self.session.refresh(detalle)
        return detalle

    async def get_detalles_by_receta(self, receta_id: str) -> Sequence[DetalleReceta]:
        query = select(DetalleReceta).where(DetalleReceta.receta_id == receta_id)
        result = await self.session.execute(query)
        return result.scalars().all()

    async def get_detalle_by_id(self, detalle_id: str) -> Optional[DetalleReceta]:
        query = select(DetalleReceta).where(DetalleReceta.id == detalle_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def update_detalle(self, detalle: DetalleReceta, schema: DetalleRecetaUpdate) -> DetalleReceta:
        update_data = schema.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(detalle, key, value)
        await self.session.commit()
        await self.session.refresh(detalle)
        return detalle

    async def delete_detalle(self, detalle: DetalleReceta) -> None:
        await self.session.delete(detalle)
        await self.session.commit()

    # --- APOYO PARA AUTORIZACIÓN (paciente dueño del recurso) ---
    async def get_paciente_id_for_receta(self, receta_id: str) -> Optional[int]:
        return await self.session.scalar(
            select(Receta.paciente_id).where(Receta.id == receta_id)
        )

    async def get_paciente_id_for_detalle(self, detalle_receta_id: str) -> Optional[int]:
        query = (
            select(Receta.paciente_id)
            .join(DetalleReceta, DetalleReceta.receta_id == Receta.id)
            .where(DetalleReceta.id == detalle_receta_id)
        )
        return await self.session.scalar(query)
