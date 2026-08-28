from lumora_api.repositories.health_summary_repository import HealthSummaryRepository
class HealthSummaryService:
    def __init__(self, repository): self.repository=repository
    async def get(self, patient_id):
        allergies=[{"id":a.id,"name":a.nombre,"description":a.observaciones,"severity":severity,"active":a.activo} for a,severity,_ in await self.repository.allergies(patient_id)]
        conditions=[{"id":c.id,"name":c.nombre,"description":c.descripcion,"diagnosed_at":c.fecha_inicio,"status":status} for c,status in await self.repository.active_conditions(patient_id)]
        return {"patient_id":patient_id,"allergies":allergies,"active_conditions":conditions}
