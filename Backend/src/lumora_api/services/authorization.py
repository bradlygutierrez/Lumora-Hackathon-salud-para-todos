"""Reglas de autorización compartidas entre recetas y horarios/dosis.

Se separan aquí (en vez de duplicarlas en cada servicio) porque tanto
`PrescriptionService` como `ScheduleService` necesitan la misma pregunta:
"¿puede este usuario ver/editar los datos de este paciente?".
"""

from sqlalchemy.ext.asyncio import AsyncSession

from lumora_api.core.exceptions import PermissionDeniedError
from lumora_api.models.identity import Paciente, Usuario
from lumora_api.repositories.identity_repository import IdentityRepository
from lumora_api.repositories.reminders import ReminderRepository

CLINICAL_STAFF_PERMISSION = "clinica:manage"


def is_clinical_staff(user: Usuario) -> bool:
    """Personal de salud vs. paciente.

    Reutiliza el mismo permiso que ya protege /expedientes
    (Depends(require_permission("clinica:manage")) en medical_records.py)
    en vez de inventar una segunda noción de "quién es staff".
    """
    return any(
        permission.nombre == CLINICAL_STAFF_PERMISSION
        for role in user.roles
        for permission in role.permisos
    )


async def own_patient_id(session: AsyncSession, user: Usuario) -> int | None:
    """paciente_id del propio usuario autenticado, o None si no tiene perfil de paciente."""
    patient = await IdentityRepository(session, Paciente).get_by_persona_id(user.persona_id)
    return patient.id if patient else None


async def ensure_can_access_patient_data(
    session: AsyncSession,
    user: Usuario,
    paciente_id: int | None,
    action: str = "read",
) -> None:
    """Autoriza personal clínico, paciente propio o cuidador con relación activa.

    `paciente_id` en None significa que el recurso todavía no se validó
    como existente; se deja pasar para que el llamador lance su propio
    ResourceNotFoundError (404) en vez de un 403 engañoso antes de saber
    si el recurso siquiera existe. Las mutaciones de cuidador requieren
    action="write" y una relación con nivel de acceso write.
    """
    if paciente_id is None or is_clinical_staff(user):
        return
    roles = {role.nombre.lower() for role in user.roles}
    if "cuidador" in roles:
        relationships = await ReminderRepository(session).get_active_relationships_for_caregiver(user.id)
        if any(
            item.paciente_id == paciente_id
            and (action == "read" or item.nivel_acceso == "write")
            for item in relationships
        ):
            return

    my_patient_id = await own_patient_id(session, user)
    if my_patient_id != paciente_id:
        raise PermissionDeniedError(
            "No tiene permiso para acceder a los datos de este paciente"
        )
