from datetime import datetime, timedelta, timezone

import pytest

from lumora_api.models import (
    Paciente,
    Persona,
    RelacionPaciente,
    TipoRelacion,
    Usuario,
)


@pytest.mark.asyncio
async def test_relationship_defaults_to_active_read_and_has_no_expiry(session_factory):
    async with session_factory() as session:
        caregiver = Usuario(
            persona=Persona(nombres="Care", apellidos="Giver"),
            email="care@example.com",
            username="care",
            password_hash="hash",
        )
        patient = Paciente(persona=Persona(nombres="Ana", apellidos="López"))
        relation_type = TipoRelacion(nombre="Madre")
        session.add_all([caregiver, patient, relation_type])
        await session.flush()
        relationship = RelacionPaciente(
            paciente_id=patient.id,
            usuario_relacionado_id=caregiver.id,
            tipo_relacion_id=relation_type.id,
        )
        session.add(relationship)
        await session.commit()
        await session.refresh(relationship)

        assert relationship.estado == "active"
        assert relationship.nivel_acceso == "read"
        assert relationship.expira_en is None


@pytest.mark.asyncio
async def test_repository_returns_only_active_non_expired_relationships(session_factory):
    async with session_factory() as session:
        caregiver = Usuario(
            persona=Persona(nombres="Care", apellidos="Giver"),
            email="care@example.com",
            username="care",
            password_hash="hash",
        )
        patients = [
            Paciente(persona=Persona(nombres=name, apellidos="Test"))
            for name in ("Active", "Pending", "Expired", "Revoked")
        ]
        relation_type = TipoRelacion(nombre="Hija")
        session.add_all([caregiver, *patients, relation_type])
        await session.flush()
        session.add_all([
            RelacionPaciente(paciente_id=patients[0].id, usuario_relacionado_id=caregiver.id, tipo_relacion_id=relation_type.id),
            RelacionPaciente(paciente_id=patients[1].id, usuario_relacionado_id=caregiver.id, tipo_relacion_id=relation_type.id, estado="pending"),
            RelacionPaciente(paciente_id=patients[2].id, usuario_relacionado_id=caregiver.id, tipo_relacion_id=relation_type.id, expira_en=datetime.now(timezone.utc) - timedelta(seconds=1)),
            RelacionPaciente(paciente_id=patients[3].id, usuario_relacionado_id=caregiver.id, tipo_relacion_id=relation_type.id, estado="revoked", activo=False),
        ])
        await session.commit()

        from lumora_api.repositories.reminders import ReminderRepository

        relationships = await ReminderRepository(session).get_active_relationships_for_caregiver(caregiver.id)

        assert [item.paciente_id for item in relationships] == [patients[0].id]
