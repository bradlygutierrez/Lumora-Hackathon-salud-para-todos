from datetime import datetime, timezone, timedelta
import logging
import re
import secrets

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from lumora_api.core.exceptions import PermissionDeniedError, ResourceConflictError, ResourceNotFoundError, ValidationError
from lumora_api.core.security import generate_token, hash_password, hash_token
from lumora_api.models import AfiliacionMedica, AfiliacionProfesional, EventoAuditoria, Persona, ProfesionalSalud, Rol, TokenRecuperacion, Usuario
from lumora_api.repositories.auth_repository import AuthRepository
from lumora_api.schemas.affiliations import AffiliationCreate, AffiliationUpdate, ProfessionalProvisionCreate
from lumora_api.services.email_service import EmailService
from lumora_api.core.config import get_settings

logger = logging.getLogger(__name__)

class MedicalAffiliationService:
    def __init__(self, session, email_service=None):
        self.session = session
        self.email_service = email_service

    async def create(self, data: AffiliationCreate, actor_id: int):
        item = AfiliacionMedica(**data.model_dump())
        self.session.add(item)
        await self.session.flush()
        self._audit("CREATE_AFFILIATION", item.id, actor_id)
        await self.session.commit()
        await self.session.refresh(item)
        return await self._read(item)

    async def _read(self, item):
        used = await self.session.scalar(select(func.count(AfiliacionProfesional.id)).where(AfiliacionProfesional.afiliacion_id == item.id, AfiliacionProfesional.activo.is_(True)))
        result = {column.name: getattr(item, column.name) for column in item.__table__.columns}
        result.update(cupos_usados=used or 0, cupos_disponibles=max(item.cupos_comprados - (used or 0), 0))
        return result

    async def list(self):
        return [await self._read(item) for item in await self.session.scalars(select(AfiliacionMedica).order_by(AfiliacionMedica.id.desc()))]

    async def get(self, affiliation_id: int):
        item = await self.session.get(AfiliacionMedica, affiliation_id)
        if item is None:
            raise ResourceNotFoundError("La afiliación no existe")
        return await self._read(item)

    async def update(self, affiliation_id: int, data: AffiliationUpdate, actor_id: int):
        item = await self.session.scalar(select(AfiliacionMedica).where(AfiliacionMedica.id == affiliation_id).with_for_update())
        if item is None: raise ResourceNotFoundError("La afiliaci?n no existe")
        values = data.model_dump(exclude_unset=True)
        if "cupos_comprados" in values:
            if item.tipo == "independiente" and values["cupos_comprados"] != 1: raise ValidationError("Una afiliaci?n independiente requiere exactamente un cupo")
            active = await self.session.scalar(select(func.count(AfiliacionProfesional.id)).where(AfiliacionProfesional.afiliacion_id == affiliation_id, AfiliacionProfesional.activo.is_(True)))
            if values["cupos_comprados"] < active: raise ResourceConflictError("No se puede reducir por debajo de los miembros activos")
        previous_status = item.estado
        for key, value in values.items():
            setattr(item, key, value)
        if values.get("estado") == "suspended":
            action = "SUSPEND_AFFILIATION"
        elif values.get("estado") == "active" and previous_status != "active":
            action = "REACTIVATE_AFFILIATION"
        elif values.get("pago_estado") == "paid":
            action = "MARK_AFFILIATION_PAID"
        else:
            action = "UPDATE_AFFILIATION"
        self._audit(action, item.id, actor_id)
        await self.session.commit()
        await self.session.refresh(item)
        return await self._read(item)

    async def provision(self, affiliation_id: int, data: ProfessionalProvisionCreate, actor_id: int):
        affiliation = await self.session.scalar(select(AfiliacionMedica).where(AfiliacionMedica.id == affiliation_id).with_for_update())
        if affiliation is None: raise ResourceNotFoundError("La afiliación no existe")
        active_count = await self.session.scalar(select(func.count(AfiliacionProfesional.id)).where(AfiliacionProfesional.afiliacion_id == affiliation_id, AfiliacionProfesional.activo.is_(True)))
        if active_count >= affiliation.cupos_comprados: raise ResourceConflictError("La afiliación no tiene cupos disponibles")
        email = str(data.email).lower()
        if await self.session.scalar(select(Usuario.id).where(Usuario.email == email)):
            raise ResourceConflictError("El correo ya está registrado")
        if await self.session.scalar(select(ProfesionalSalud.id).where(ProfesionalSalud.numero_licencia == data.numero_licencia)):
            raise ResourceConflictError("El número de licencia ya está registrado")
        role = await self.session.scalar(select(Rol).where(Rol.nombre == "Profesional de Salud"))
        if role is None: raise ResourceNotFoundError("El rol Profesional de Salud no está configurado")
        username = await self._username(data.username or email.split("@", 1)[0])
        person = Persona(nombres=data.first_names, apellidos=data.last_names, email=email, telefono=data.phone, fecha_nacimiento=data.birth_date, sexo_id=data.sex_id)
        password = secrets.token_urlsafe(32)
        user = Usuario(persona=person, email=email, username=username, password_hash=hash_password(password), email_verificado=False, roles=[role])
        professional = ProfesionalSalud(persona=person, especialidad=data.especialidad, numero_licencia=data.numero_licencia)
        membership = AfiliacionProfesional(afiliacion=affiliation, profesional=professional, activo=True)
        self.session.add_all([person, user, professional, membership])
        try:
            await self.session.flush()
            raw_token = generate_token()
            self.session.add(TokenRecuperacion(usuario_id=user.id, token_hash=hash_token(raw_token), expires_at=datetime.now(timezone.utc) + timedelta(minutes=get_settings().recovery_token_minutes)))
            self._audit("PROVISION_PROFESSIONAL", professional.id, actor_id)
            await self.session.commit()
        except IntegrityError as error:
            await self.session.rollback()
            raise ResourceConflictError("El correo, usuario o licencia ya está registrado") from error
        except Exception:
            await self.session.rollback()
            raise
        try:
            (self.email_service or EmailService()).send_password_reset(email, raw_token)
        except RuntimeError:
            logger.exception("Professional activation delivery failed for user_id=%s", user.id)
            activation_sent = False
        else:
            activation_sent = True
        return {"user_id": user.id, "professional_id": professional.id, "membership_id": membership.id, "activation_sent": activation_sent}

    async def update_membership(self, affiliation_id: int, professional_id: int, active: bool, actor_id: int):
        item = await self.session.scalar(select(AfiliacionProfesional).where(AfiliacionProfesional.afiliacion_id == affiliation_id, AfiliacionProfesional.profesional_id == professional_id))
        if item is None: raise ResourceNotFoundError("La afiliación del profesional no existe")
        if active and not item.activo:
            affiliation = await self.session.scalar(select(AfiliacionMedica).where(AfiliacionMedica.id == affiliation_id).with_for_update())
            count = await self.session.scalar(select(func.count(AfiliacionProfesional.id)).where(AfiliacionProfesional.afiliacion_id == affiliation_id, AfiliacionProfesional.activo.is_(True)))
            if count >= affiliation.cupos_comprados: raise ResourceConflictError("La afiliación no tiene cupos disponibles")
        item.activo = active
        await self.session.commit()
        return item

    async def verify_license(self, professional_id: int, verified: bool, actor_id: int):
        professional = await self.session.get(ProfesionalSalud, professional_id)
        if professional is None: raise ResourceNotFoundError("El profesional no existe")
        professional.licencia_verificada = verified
        professional.licencia_verificada_en = datetime.now(timezone.utc) if verified else None
        professional.licencia_verificada_por_usuario_id = actor_id if verified else None
        self._audit("VERIFY_MEDICAL_LICENSE", professional_id, actor_id, entity="profesional_salud")
        await self.session.commit()
        return professional

    async def _username(self, base: str) -> str:
        base = re.sub(r"[^a-zA-Z0-9_.-]", ".", base).strip(".").lower()[:45] or "profesional"
        candidate = base; suffix = 1
        while await self.session.scalar(select(Usuario.id).where(Usuario.username == candidate)):
            suffix += 1; candidate = f"{base[:45-len(str(suffix))]}.{suffix}"
        return candidate

    def _audit(self, action, resource_id, actor_id, entity="afiliacion_medica"):
        self.session.add(EventoAuditoria(accion=action, entidad=entity, entidad_id=resource_id, usuario_id=actor_id))

    async def professionals(self, affiliation_id: int):
        rows = await self.session.scalars(select(AfiliacionProfesional).options(selectinload(AfiliacionProfesional.profesional).selectinload(ProfesionalSalud.persona).selectinload(Persona.usuario)).where(AfiliacionProfesional.afiliacion_id == affiliation_id))
        result=[]
        for membership in rows:
            professional=membership.profesional; person=professional.persona; user=person.usuario
            result.append({"membership_id":membership.id,"professional_id":professional.id,"user_id":user.id,"first_names":person.nombres,"last_names":person.apellidos,"email":user.email,"especialidad":professional.especialidad,"numero_licencia":professional.numero_licencia,"licencia_verificada":professional.licencia_verificada,"membership_activo":membership.activo,"user_activo":user.activo,"email_verificado":user.email_verificado})
        return result
