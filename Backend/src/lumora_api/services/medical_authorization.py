from datetime import datetime, timezone
from sqlalchemy import select
from lumora_api.core.exceptions import PermissionDeniedError
from lumora_api.models import AfiliacionMedica, AfiliacionProfesional, ProfesionalSalud, Usuario

async def ensure_active_medical_affiliation(session, user: Usuario) -> ProfesionalSalud:
    if not any(p.nombre == "clinica:manage" for r in user.roles for p in r.permisos):
        raise PermissionDeniedError("No tiene permiso para operar clínicamente")
    professional = await session.scalar(select(ProfesionalSalud).where(ProfesionalSalud.persona_id == user.persona_id, ProfesionalSalud.deleted_at.is_(None)))
    professional_id = professional.id if professional else -1
    now = datetime.now(timezone.utc)
    membership = await session.scalar(select(AfiliacionProfesional).join(AfiliacionMedica).where(AfiliacionProfesional.profesional_id == professional_id, AfiliacionProfesional.activo.is_(True), AfiliacionMedica.estado == "active", AfiliacionMedica.inicia_en.is_(None) | (AfiliacionMedica.inicia_en <= now), AfiliacionMedica.pago_estado == "paid", (AfiliacionMedica.expira_en.is_(None) | (AfiliacionMedica.expira_en > now))))
    if professional is None or not professional.licencia_verificada or membership is None:
        raise PermissionDeniedError("El acceso clínico del profesional no está habilitado")
    return professional
