import argparse, asyncio
from sqlalchemy import delete, select
from lumora_api.core.config import get_settings
from lumora_api.core.security import hash_password
from lumora_api.db.session import SessionLocal
from lumora_api.models import Persona, Paciente, RelacionPaciente, Rol, TipoRelacion, Usuario
CAREGIVER_EMAIL = "caregiver.b09@lumora.test"
PATIENT_EMAILS = ("patient.a.b09@lumora.test", "patient.b.b09@lumora.test")
async def seed_b09(session):
    caregiver_role = await session.scalar(select(Rol).where(Rol.nombre == "Cuidador")) or Rol(nombre="Cuidador")
    patient_role = await session.scalar(select(Rol).where(Rol.nombre == "Paciente")) or Rol(nombre="Paciente")
    session.add_all([caregiver_role, patient_role]); await session.flush()
    caregiver = await session.scalar(select(Usuario).where(Usuario.email == CAREGIVER_EMAIL))
    if caregiver is None: caregiver = Usuario(persona=Persona(nombres="B09 Caregiver", apellidos="Test"), email=CAREGIVER_EMAIL, username="caregiver_b09", password_hash=hash_password("Test1234!"), roles=[caregiver_role]); session.add(caregiver)
    elif caregiver_role not in caregiver.roles: caregiver.roles.append(caregiver_role)
    patients=[]
    for i,email in enumerate(PATIENT_EMAILS):
        user=await session.scalar(select(Usuario).where(Usuario.email==email))
        if user is None:
            user=Usuario(persona=Persona(nombres=f"Patient {chr(65+i)}",apellidos="B09 Test"),email=email,username=f"patient_{chr(97+i)}_b09",password_hash=hash_password("Test1234!"),roles=[patient_role]); session.add(user); await session.flush(); patient=Paciente(persona_id=user.persona_id); session.add(patient)
        else: patient=await session.scalar(select(Paciente).where(Paciente.persona_id==user.persona_id))
        patients.append(patient)
    await session.flush()
    for patient,label in zip(patients,("Madre","Tutor Legal")):
        rt=await session.scalar(select(TipoRelacion).where(TipoRelacion.nombre==label)) or TipoRelacion(nombre=label); session.add(rt); await session.flush()
        rel=await session.scalar(select(RelacionPaciente).where(RelacionPaciente.usuario_relacionado_id==caregiver.id,RelacionPaciente.paciente_id==patient.id))
        if rel is None: session.add(RelacionPaciente(paciente_id=patient.id,usuario_relacionado_id=caregiver.id,tipo_relacion_id=rt.id,estado="active",nivel_acceso="read",activo=True))
        else: rel.estado,rel.nivel_acceso,rel.activo,rel.tipo_relacion_id="active","read",True,rt.id
    await session.commit(); return {"caregiver_id":caregiver.id,"patient_ids":[p.id for p in patients]}
async def remove_b09(session):
    users=list(await session.scalars(select(Usuario).where(Usuario.email.in_((CAREGIVER_EMAIL,*PATIENT_EMAILS))))); ids=[u.id for u in users]; pids=list(await session.scalars(select(Paciente.id).where(Paciente.persona_id.in_([u.persona_id for u in users]))))
    if ids: await session.execute(delete(RelacionPaciente).where(RelacionPaciente.usuario_relacionado_id.in_(ids)))
    if pids: await session.execute(delete(RelacionPaciente).where(RelacionPaciente.paciente_id.in_(pids))); await session.execute(delete(Paciente).where(Paciente.id.in_(pids)))
    if ids: await session.execute(delete(Usuario).where(Usuario.id.in_(ids)))
    await session.commit()
async def main(action):
    if get_settings().environment=="production": raise RuntimeError("B09 seed disabled in production")
    async with SessionLocal() as s:
        result=await seed_b09(s) if action=="seed" else await remove_b09(s)
        if result: print(result)
if __name__=="__main__":
    p=argparse.ArgumentParser(); p.add_argument("action",choices=("seed","remove")); asyncio.run(main(p.parse_args().action))
