import pytest
from sqlalchemy import select

from lumora_api.core.security import hash_password
from lumora_api.models import Paciente, Persona, RelacionPaciente, Rol, TipoRelacion, Usuario
from lumora_api.schemas.reminders import RelacionPacienteCreate
from lumora_api.services.reminders import ReminderService


@pytest.mark.asyncio
async def test_relationship_and_caregiver_role_roll_back_together(
    session_factory, monkeypatch
):
    async with session_factory() as session:
        patient_role = Rol(nombre="Paciente")
        caregiver_role = Rol(nombre="Cuidador")
        relationship_type = TipoRelacion(nombre="Familiar")
        owner = Usuario(
            persona=Persona(nombres="Juan", apellidos="Paciente"),
            email="owner@example.com",
            username="owner",
            password_hash=hash_password("Secure123!"),
            roles=[patient_role],
        )
        related = Usuario(
            persona=Persona(nombres="María", apellidos="Familiar"),
            email="related@example.com",
            username="related",
            password_hash=hash_password("Secure123!"),
            roles=[],
        )
        session.add_all([caregiver_role, relationship_type, owner, related])
        await session.flush()
        patient = Paciente(persona_id=owner.persona_id)
        session.add(patient)
        await session.commit()
        related_id = related.id
        patient_id = patient.id
        relationship_type_id = relationship_type.id

    async with session_factory() as session:
        service = ReminderService(session)
        original_create = service.repo.create_relacion

        async def fail_after_flush(relationship):
            await original_create(relationship)
            raise RuntimeError("relationship insert failed")

        monkeypatch.setattr(service.repo, "create_relacion", fail_after_flush)
        with pytest.raises(RuntimeError, match="relationship insert failed"):
            await service.crear_relacion_paciente(
                RelacionPacienteCreate(
                    paciente_id=patient_id,
                    usuario_relacionado_id=related_id,
                    tipo_relacion_id=relationship_type_id,
                )
            )

    async with session_factory() as session:
        related = await session.get(Usuario, related_id)
        assert related.roles == []
        assert list(
            await session.scalars(
                select(RelacionPaciente).where(
                    RelacionPaciente.usuario_relacionado_id == related_id
                )
            )
        ) == []
