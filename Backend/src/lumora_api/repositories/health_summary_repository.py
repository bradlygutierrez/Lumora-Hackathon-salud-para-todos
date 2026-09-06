from sqlalchemy import select
from lumora_api.models import Alergia, CondicionMedica, EstadoCondicion, Expediente, NivelSeveridad
class HealthSummaryRepository:
    def __init__(self, session): self.session=session
    async def allergies(self, patient_id):
        rows=await self.session.execute(select(Alergia, NivelSeveridad.nombre, EstadoCondicion.nombre).outerjoin(NivelSeveridad, NivelSeveridad.id==Alergia.nivel_severidad_id).outerjoin(EstadoCondicion, EstadoCondicion.id==Alergia.estado_condicion_id).where(Alergia.paciente_id==patient_id,Alergia.activo.is_(True),Alergia.deleted_at.is_(None)).order_by(Alergia.id))
        return rows.all()
    async def active_conditions(self, patient_id):
        record=await self.session.scalar(select(Expediente).where(Expediente.paciente_id==patient_id,Expediente.activo.is_(True),Expediente.deleted_at.is_(None)))
        if record is None: return []
        rows=await self.session.execute(select(CondicionMedica, EstadoCondicion.nombre).outerjoin(EstadoCondicion, EstadoCondicion.id==CondicionMedica.estado_condicion_id).where(CondicionMedica.paciente_id==patient_id,CondicionMedica.expediente_id==record.id,CondicionMedica.activo.is_(True),CondicionMedica.deleted_at.is_(None)).order_by(CondicionMedica.id))
        return rows.all()
