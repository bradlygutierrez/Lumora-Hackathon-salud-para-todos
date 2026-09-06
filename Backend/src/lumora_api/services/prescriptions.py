from typing import Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from lumora_api.core.exceptions import (
    PermissionDeniedError,
    ResourceConflictError,
    ResourceNotFoundError,
)
from lumora_api.models.clinical import ConsultaMedica
from lumora_api.models.identity import Paciente, ProfesionalSalud, Usuario
from lumora_api.models.prescriptions import DetalleReceta, Medicamento, Receta
from lumora_api.repositories.identity_repository import IdentityRepository
from lumora_api.repositories.prescriptions import PrescriptionRepository
from lumora_api.schemas.prescriptions import (
    DetalleRecetaCreate,
    DetalleRecetaUpdate,
    MedicamentoCreate,
    MedicamentoUpdate,
    RecetaCreate,
    RecetaUpdate,
)
from lumora_api.services.authorization import (
    ensure_can_access_patient_data,
    ensure_patient_is_assigned_to_professional,
    ensure_within_editable_window,
)


class PrescriptionService:
    """Capa de servicio de Recetas y medicamentos.

    Mantiene la autorización de lectura existente y, para las mutaciones
    clínicas, enlaza la receta al perfil ProfesionalSalud del usuario
    autenticado. El profesional nunca se confía solo porque el cliente
    envíe un profesional_id.
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

    async def update_medicamento(
        self, medicamento_id: str, schema: MedicamentoUpdate
    ) -> Medicamento:
        medicamento = await self.get_medicamento(medicamento_id)
        return await self.repository.update_medicamento(medicamento, schema)

    async def delete_medicamento(self, medicamento_id: str) -> None:
        medicamento = await self.get_medicamento(medicamento_id)
        await self.repository.delete_medicamento(medicamento)

    async def _current_professional(
        self, current_user: Usuario
    ) -> ProfesionalSalud:
        professional = await IdentityRepository(
            self.repository.session, ProfesionalSalud
        ).get_by_persona_id(current_user.persona_id)
        if professional is None:
            raise PermissionDeniedError(
                "El usuario autenticado no tiene un perfil profesional de salud"
            )
        return professional

    async def _patient(self, patient_id: int) -> Paciente:
        patient = await IdentityRepository(
            self.repository.session, Paciente
        ).get(patient_id)
        if patient is None:
            raise ResourceNotFoundError("Paciente no encontrado")
        return patient

    async def _consultation(self, consultation_id: int) -> ConsultaMedica:
        consultation = await IdentityRepository(
            self.repository.session, ConsultaMedica
        ).get(consultation_id)
        if consultation is None:
            raise ResourceNotFoundError("Consulta médica no encontrada")
        return consultation

    async def _owned_recipe(
        self, current_user: Usuario, receta_id: str
    ) -> Receta:
        receta = await self.repository.get_receta_by_id(receta_id)
        if receta is None:
            raise ResourceNotFoundError("Receta no encontrada")
        professional = await self._current_professional(current_user)
        if receta.profesional_id != professional.id:
            raise PermissionDeniedError(
                "No puede modificar una receta emitida por otro profesional"
            )
        await ensure_can_access_patient_data(
            self.repository.session,
            current_user,
            receta.paciente_id,
            action="write",
        )
        # La propiedad de la receta por sí sola no re-confirma que la
        # relación con el paciente siga vigente (p. ej. si la única cita
        # que la había establecido se canceló después) -- se revalida acá,
        # igual que al crearla.
        await ensure_patient_is_assigned_to_professional(
            self.repository.session, professional.id, receta.paciente_id
        )
        ensure_within_editable_window(receta.fecha_emision)
        return receta

    # --- RECETAS ---
    async def create_receta(
        self, current_user: Usuario, schema: RecetaCreate
    ) -> Receta:
        professional = await self._current_professional(current_user)
        patient = await self._patient(schema.paciente_id)
        await ensure_can_access_patient_data(
            self.repository.session,
            current_user,
            patient.id,
            action="write",
        )
        await ensure_patient_is_assigned_to_professional(
            self.repository.session, professional.id, patient.id
        )
        if schema.profesional_id != professional.id:
            raise PermissionDeniedError(
                "No puede emitir recetas a nombre de otro profesional"
            )

        if schema.consulta_id is not None:
            consultation = await self._consultation(schema.consulta_id)
            if consultation.paciente_id != patient.id:
                raise ResourceConflictError(
                    "La consulta no pertenece al paciente de la receta"
                )
            if consultation.profesional_id != professional.id:
                raise PermissionDeniedError(
                    "La consulta pertenece a otro profesional de salud"
                )

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

    async def update_receta(
        self,
        current_user: Usuario,
        receta_id: str,
        schema: RecetaUpdate,
    ) -> Receta:
        receta = await self._owned_recipe(current_user, receta_id)
        return await self.repository.update_receta(receta, schema)

    # --- DETALLES DE RECETA ---
    async def create_detalle(
        self,
        current_user: Usuario,
        receta_id: str,
        schema: DetalleRecetaCreate,
    ) -> DetalleReceta:
        await self._owned_recipe(current_user, receta_id)
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
        self,
        current_user: Usuario,
        receta_id: str,
        detalle_id: str,
        schema: DetalleRecetaUpdate,
    ) -> DetalleReceta:
        await self._owned_recipe(current_user, receta_id)
        detalle = await self.repository.get_detalle_by_id(detalle_id)
        if detalle is None or detalle.receta_id != receta_id:
            raise ResourceNotFoundError(
                "Detalle no encontrado en la receta especificada"
            )
        return await self.repository.update_detalle(detalle, schema)

    async def delete_detalle(
        self,
        current_user: Usuario,
        receta_id: str,
        detalle_id: str,
    ) -> None:
        await self._owned_recipe(current_user, receta_id)
        detalle = await self.repository.get_detalle_by_id(detalle_id)
        if detalle is None or detalle.receta_id != receta_id:
            raise ResourceNotFoundError(
                "Detalle no encontrado en la receta especificada"
            )
        await self.repository.delete_detalle(detalle)
