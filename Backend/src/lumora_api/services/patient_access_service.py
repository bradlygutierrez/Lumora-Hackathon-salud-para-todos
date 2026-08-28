from lumora_api.core.exceptions import PermissionDeniedError, ResourceNotFoundError
from lumora_api.models import Usuario
from lumora_api.repositories.patient_access_repository import PatientAccessRepository
from lumora_api.repositories.reminders import ReminderRepository


class PatientAccessService:
    def __init__(self, repository: PatientAccessRepository) -> None:
        self.repository = repository

    @staticmethod
    def current_user_context(user: Usuario) -> dict:
        return {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "activo": user.activo,
            "email_verificado": user.email_verificado,
            "roles": [{"id": role.id, "nombre": role.nombre} for role in user.roles],
            "persona": {
                "id": user.persona.id,
                "nombres": user.persona.nombres,
                "apellidos": user.persona.apellidos,
            },
        }

    async def own_patient(self, user_id: int):
        patient = await self.repository.patient_for_user(user_id)
        if patient is None:
            raise ResourceNotFoundError("Perfil de paciente no encontrado")
        return {
            "patient_id": patient.id,
            "first_names": patient.persona.nombres,
            "last_names": patient.persona.apellidos,
        }

    async def require_access(self, user: Usuario, patient_id: int, action: str = "read") -> None:
        roles = {role.nombre.lower() for role in user.roles}
        own = await self.repository.patient_for_user(user.id)
        if "paciente" in roles and own is not None and own.id == patient_id:
            return
        if "cuidador" in roles:
            relationships = await ReminderRepository(self.repository.session).get_active_relationships_for_caregiver(user.id)
            if any(item.paciente_id == patient_id and (action == "read" or item.nivel_acceso == "write") for item in relationships):
                return
        if "profesional" in roles or "administrador" in roles:
            permissions = {permission.nombre for role in user.roles for permission in role.permisos}
            if "clinica:manage" in permissions:
                return
        raise ResourceNotFoundError("Paciente no encontrado")

    async def linked_patients(self, user: Usuario) -> list[dict]:
        if not any(role.nombre.lower() == "cuidador" for role in user.roles):
            raise PermissionDeniedError("El usuario no es cuidador")
        relationships = await ReminderRepository(self.repository.session).get_active_relationships_for_caregiver(user.id)
        return [{
            "patient_id": rel.paciente_id,
            "relationship": rel.tipo_relacion.nombre,
            "status": rel.estado,
            "access_level": rel.nivel_acceso,
            "patient": {"id": rel.paciente.id, "first_names": rel.paciente.persona.nombres, "last_names": rel.paciente.persona.apellidos},
        } for rel in relationships]
