import pytest
from sqlalchemy import select
from lumora_api.core.security import create_access_token, hash_password
from lumora_api.models import Alergia, CondicionMedica, EstadoCondicion, Expediente, EstadoExpediente, MetodoMfa, Paciente, Persona, Rol, TipoRelacion, Usuario, RelacionPaciente
async def seed(session_factory):
    async with session_factory() as s:
        patient_role=Rol(nombre="Paciente"); caregiver_role=Rol(nombre="Cuidador"); s.add_all([patient_role,caregiver_role,EstadoExpediente(nombre="Activo"),EstadoCondicion(nombre="Activa"),TipoRelacion(nombre="Madre")]); await s.flush()
        pu=Usuario(persona=Persona(nombres="Ana",apellidos="Paciente"),email="b10.patient@example.com",username="b10patient",password_hash=hash_password("Safe123!"),roles=[patient_role])
        cu=Usuario(persona=Persona(nombres="Cuida",apellidos="Dor"),email="b10.caregiver@example.com",username="b10caregiver",password_hash=hash_password("Safe123!"),roles=[caregiver_role]); s.add_all([pu,cu]); await s.flush()
        p=Paciente(persona_id=pu.persona_id); s.add(p); await s.flush(); rel=RelacionPaciente(paciente_id=p.id,usuario_relacionado_id=cu.id,tipo_relacion_id=1,estado="active",activo=True); s.add(rel); await s.commit(); return pu.id,cu.id,p.id
@pytest.mark.asyncio
async def test_patient_health_summary_and_caregiver_access(client,session_factory):
    patient_id, caregiver_id, pid = await seed(session_factory)
    r=await client.get(f"/api/v1/patients/{pid}/health-summary",headers={"Authorization":f"Bearer {create_access_token(patient_id)}"}); assert r.status_code==200; assert r.json()=={"patient_id":pid,"allergies":[],"active_conditions":[]}
    r=await client.get(f"/api/v1/patients/{pid}/health-summary",headers={"Authorization":f"Bearer {create_access_token(caregiver_id)}"}); assert r.status_code==200
@pytest.mark.asyncio
async def test_unrelated_patient_health_summary_denied(client,session_factory):
    patient_id, _, pid = await seed(session_factory)
    async with session_factory() as s:
        patient_role = await s.scalar(select(Rol).where(Rol.nombre == "Paciente"))
        other=Usuario(persona=Persona(nombres="Otra",apellidos="Persona"),email="other.b10@example.com",username="otherb10",password_hash=hash_password("Safe123!"),roles=[patient_role]); s.add(other); await s.flush(); p=Paciente(persona_id=other.persona_id); s.add(p); await s.commit(); other_pid=p.id
    r=await client.get(f"/api/v1/patients/{other_pid}/health-summary",headers={"Authorization":f"Bearer {create_access_token(patient_id)}"}); assert r.status_code==403
