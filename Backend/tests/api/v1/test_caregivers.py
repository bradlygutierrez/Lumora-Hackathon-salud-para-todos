import pytest
from lumora_api.core.security import create_access_token
from lumora_api.models import Persona, Paciente, RelacionPaciente, Rol, TipoRelacion, Usuario


async def seed(session_factory, caregiver=True):
    async with session_factory() as s:
        role = Rol(nombre="Cuidador" if caregiver else "Paciente")
        p_role = Rol(nombre="Paciente") if caregiver else role
        suffix = "care" if caregiver else "patient"
        relation_type = TipoRelacion(nombre=f"Madre{suffix}")
        s.add_all([role, p_role, relation_type])
        await s.flush()
        person = Persona(nombres="Ana", apellidos="Cuidadora")
        patient_person = Persona(nombres="Luis", apellidos="Paciente")
        user = Usuario(persona=person, email=f"{suffix}@example.com", username=suffix, password_hash="x")
        patient_user = Usuario(persona=patient_person, email=f"{suffix}pat@example.com", username=f"{suffix}pat", password_hash="x")
        patient = Paciente(persona=patient_person)
        user.roles.append(role); patient_user.roles.append(p_role)
        s.add_all([user, patient_user, patient]); await s.flush()
        s.add(RelacionPaciente(paciente_id=patient.id, usuario_relacionado_id=user.id, tipo_relacion_id=relation_type.id))
        await s.commit()
        return user.id


@pytest.mark.asyncio
async def test_caregiver_gets_only_linked_patients(client, session_factory):
    user_id = await seed(session_factory)
    response = await client.get("/api/v1/caregivers/me/patients", headers={"Authorization": f"Bearer {create_access_token(user_id)}"})
    assert response.status_code == 200
    assert response.json()["items"][0]["patient"]["first_names"] == "Luis"


@pytest.mark.asyncio
async def test_non_caregiver_is_denied(client, session_factory):
    user_id = await seed(session_factory, caregiver=False)
    response = await client.get("/api/v1/caregivers/me/patients", headers={"Authorization": f"Bearer {create_access_token(user_id)}"})
    assert response.status_code == 403
