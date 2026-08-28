from typing import Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from lumora_api.core.exceptions import ResourceNotFoundError
from lumora_api.models.identity import Usuario
from lumora_api.models.prescriptions import DetalleReceta, Medicamento, Receta
from lumora_api.repositories.prescriptions import PrescriptionRepository
from lumora_api.schemas.prescriptions import (
    DetalleRecetaCreate,
    DetalleRecetaUpdate,
    MedicamentoCreate,
    MedicamentoUpdate,
    RecetaCreate,
    RecetaUpdate,
)
from lumora_api.services.authorization import ensure_can_access_patient_data


class PrescriptionService:
    """Capa de servicio de Recetas y medicamentos.

    api/v1/prescriptions.py llamaba antes directo a PrescriptionRepository,
    lo que rompe la arquitectura en capas Router -> Service -> Repository
    que pide AGENTS.md. Esta clase reubica esa lógica y agrega las
    validaciones de autorización (paciente dueño del recurso vs. personal
    clínico) que antes no existían en ningún lado.
    """

    def __init__(self, repository: PrescriptionRepository) -> None:
        self.repository = repository

    # --- MEDICAMENTOS (catálogo clínico, no depende de un paciente) ---
    async def create_medicamento(self, schema: MedicamentoCreate) -> Medicamento:
        return await self.repository.create_medicamento(schema)

    async def list_medicamentos(self, limit: int, offset: int) -> Sequence[Medicamento]:
        return await self.repository.get_medicamentos(limit=limit, offset=offset)

    async def get_medicamento(self, medicamento_id: str) -> Medicamento:
        medicamento = await self.repository.get_medicamento_by_id(medicamento_id)
        if medicamento is None:
            raise ResourceNotFoundError("Medicamento no encontrado")
        return medicamento

    async def update_medicamento(self, medicamento_id: str, schema: MedicamentoUpdate) -> Medicamento:
        medicamento = await self.get_medicamento(medicamento_id)
        return await self.repository.update_medicamento(medicamento, schema)

    async def delete_medicamento(self, medicamento_id: str) -> None:
        medicamento = await self.get_medicamento(medicamento_id)
        await self.repository.delete_medicamento(medicamento)

    # --- RECETAS ---
    async def create_receta(self, schema: RecetaCreate) -> Receta:
        return await self.repository.create_receta(schema)

    async def get_receta(
        self, session: AsyncSession, current_user: Usuario, receta_id: str
    ) -> Receta:
        receta = await self.repository.get_receta_by_id(receta_id)
        if receta is None:
            raise ResourceNotFoundError("Receta no encontrada")
        await ensure_can_access_patient_data(session, current_user, receta.paciente_id)
        return receta

    async def get_recetas_by_patient(
        self, session: AsyncSession, current_user: Usuario, paciente_id: int
    ) -> Sequence[Receta]:
        await ensure_can_access_patient_data(session, current_user, paciente_id)
        return await self.repository.get_recetas_by_paciente(paciente_id)

    async def update_receta(self, receta_id: str, schema: RecetaUpdate) -> Receta:
        receta = await self.repository.get_receta_by_id(receta_id)
        if receta is None:
            raise ResourceNotFoundError("Receta no encontrada")
        return await self.repository.update_receta(receta, schema)

    # --- DETALLES DE RECETA ---
    async def create_detalle(self, receta_id: str, schema: DetalleRecetaCreate) -> DetalleReceta:
        receta = await self.repository.get_receta_by_id(receta_id)
        if receta is None:
            raise ResourceNotFoundError("Receta no encontrada")
        return await self.repository.create_detalle(receta_id, schema)

    async def get_detalles(
        self, session: AsyncSession, current_user: Usuario, receta_id: str
    ) -> Sequence[DetalleReceta]:
        receta = await self.repository.get_receta_by_id(receta_id)
        if receta is None:
            raise ResourceNotFoundError("Receta no encontrada")
        await ensure_can_access_patient_data(session, current_user, receta.paciente_id)
        return await self.repository.get_detalles_by_receta(receta_id)

    async def update_detalle(
        self, receta_id: str, detalle_id: str, schema: DetalleRecetaUpdate
    ) -> DetalleReceta:
        detalle = await self.repository.get_detalle_by_id(detalle_id)
        if detalle is None or detalle.receta_id != receta_id:
            raise ResourceNotFoundError(
                "Detalle no encontrado en la receta especificada"
            )
        return await self.repository.update_detalle(detalle, schema)

    async def delete_detalle(self, receta_id: str, detalle_id: str) -> None:
        detalle = await self.repository.get_detalle_by_id(detalle_id)
        if detalle is None or detalle.receta_id != receta_id:
            raise ResourceNotFoundError(
                "Detalle no encontrado en la receta especificada"
            )
        await self.repository.delete_detalle(detalle)
