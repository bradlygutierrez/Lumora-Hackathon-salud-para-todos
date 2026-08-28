"""Reglas de autorización compartidas entre recetas y horarios/dosis.

Se separan aquí (en vez de duplicarlas en cada servicio) porque tanto
`PrescriptionService` como `ScheduleService` necesitan la misma pregunta:
"¿puede este usuario ver/editar los datos de este paciente?".
"""

from sqlalchemy.ext.asyncio import AsyncSession

from lumora_api.core.exceptions import PermissionDeniedError
from lumora_api.models.identity import Paciente, Usuario
from lumora_api.repositories.identity_repository import IdentityRepository

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
    session: AsyncSession, user: Usuario, paciente_id: int | None
) -> None:
    """Deja pasar a personal clínico o al propio paciente dueño del recurso.

    `paciente_id` en None significa que el recurso todavía no se validó
    como existente; se deja pasar para que el llamador lance su propio
    ResourceNotFoundError (404) en vez de un 403 engañoso antes de saber
    si el recurso siquiera existe.
    """
    if paciente_id is None or is_clinical_staff(user):
        return
    my_patient_id = await own_patient_id(session, user)
    if my_patient_id != paciente_id:
        raise PermissionDeniedError(
            "No tiene permiso para acceder a los datos de este paciente"
        )
