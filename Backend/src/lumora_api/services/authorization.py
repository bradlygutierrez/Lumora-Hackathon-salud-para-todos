"""Reglas de autorización compartidas entre recetas y horarios/dosis.

Se separan aquí (en vez de duplicarlas en cada servicio) porque tanto
`PrescriptionService` como `ScheduleService` necesitan la misma pregunta:
"¿puede este usuario ver/editar los datos de este paciente?".
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from lumora_api.core.exceptions import PermissionDeniedError, ResourceConflictError
from lumora_api.models.identity import Paciente, ProfesionalSalud, Usuario
from lumora_api.repositories.identity_repository import IdentityRepository
from lumora_api.repositories.professional_workspace_repository import (
    ProfessionalWorkspaceRepository,
)
from lumora_api.repositories.reminders import ReminderRepository
from lumora_api.services.medical_authorization import ensure_active_medical_affiliation

CLINICAL_STAFF_PERMISSION = "clinica:manage"


def has_clinical_permission(user: Usuario) -> bool:
    """Return the RBAC capability without asserting operational eligibility."""
    return any(
        permission.nombre == CLINICAL_STAFF_PERMISSION
        for role in user.roles
        for permission in role.permisos
    )

def is_clinical_staff(user: Usuario) -> bool:
    """Personal de salud vs. paciente.

    Reutiliza el mismo permiso que ya protege /expedientes
    (Depends(require_permission("clinica:manage")) en medical_records.py)
    en vez de inventar una segunda noción de "quién es staff".
    """
    return has_clinical_permission(user)


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
    if paciente_id is None:
        return
    if has_clinical_permission(user):
        if action == "write":
            await ensure_active_medical_affiliation(session, user)
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


async def resolve_current_professional(
    session: AsyncSession, user: Usuario
) -> ProfesionalSalud:
    """`ProfesionalSalud` del usuario autenticado, o 403 si no tiene uno.

    Compartido por los servicios clínicos que necesitan saber "a nombre
    de quién" está escribiendo el usuario actual (recetas, consultas,
    diagnósticos) -- nunca se confía en un profesional_id que mande el
    cliente sin verificarlo contra esto.
    """
    professional = await IdentityRepository(session, ProfesionalSalud).get_by_persona_id(
        user.persona_id
    )
    if professional is None:
        raise PermissionDeniedError(
            "El usuario autenticado no tiene un perfil profesional de salud"
        )
    return professional


async def ensure_patient_is_assigned_to_professional(
    session: AsyncSession, professional_id: int, paciente_id: int
) -> None:
    """Exige que el paciente tenga al menos una cita o consulta real con
    este profesional (misma noción que ya usa el workspace del
    profesional para "mis pacientes"). `clinica:manage` por sí solo
    autoriza leer/navegar el directorio de pacientes, pero no alcanza
    para escribir datos clínicos (receta, consulta, diagnóstico) de un
    paciente con el que el profesional nunca tuvo contacto -- ver
    `ProfessionalWorkspaceRepository.related_patient_ids`.

    No se aplica a la creación de citas (`appointments.py`): ahí el
    profesional recién está estableciendo la relación con un paciente
    nuevo, así que exigir una relación previa sería circular.
    """
    related_ids = await ProfessionalWorkspaceRepository(session).related_patient_ids(
        professional_id
    )
    if paciente_id not in related_ids:
        raise PermissionDeniedError(
            "El paciente no está asignado a este profesional; "
            "agende una cita o consulta antes de registrar datos clínicos"
        )


async def ensure_clinical_relationship_if_professional(
    session: AsyncSession, user: Usuario, paciente_id: int
) -> None:
    """Para mediciones/alertas: si quien actúa es personal clínico con un
    perfil de `ProfesionalSalud` real, exige que esté asignado a ese
    paciente (mismo criterio que recetas/consultas/diagnósticos). No
    afecta a administradores con `clinica:manage` pero sin perfil
    profesional -- ese acceso más amplio ya se decide en otro lado
    (`PatientAccessService.require_access`) y no es lo que se está
    corrigiendo acá.
    """
    if not has_clinical_permission(user):
        return
    professional = await IdentityRepository(session, ProfesionalSalud).get_by_persona_id(
        user.persona_id
    )
    if professional is None:
        return
    await ensure_patient_is_assigned_to_professional(session, professional.id, paciente_id)


EDITABLE_WINDOW_HOURS = 48


def ensure_within_editable_window(
    registered_at: datetime, hours: int = EDITABLE_WINDOW_HOURS
) -> None:
    """Bloquea la edición/borrado de un registro clínico (diagnóstico,
    receta) una vez pasada la ventana de corrección.

    Sin esto, un diagnóstico o receta de una consulta de hace meses se
    podía seguir editando o borrando sin ningún límite. Se ata a la fecha
    de registro del propio dato (no al estado de la cita/consulta, que no
    siempre existe o no refleja cuándo se escribió el dato) -- decisión
    de producto: ventana de tiempo fija en vez de depender del estado de
    la cita.
    """
    reference = (
        registered_at
        if registered_at.tzinfo is not None
        else registered_at.replace(tzinfo=timezone.utc)
    )
    if datetime.now(timezone.utc) - reference > timedelta(hours=hours):
        raise ResourceConflictError(
            f"No se puede modificar: pasaron más de {hours} horas desde su registro"
        )