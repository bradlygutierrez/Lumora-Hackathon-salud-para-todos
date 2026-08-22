from datetime import datetime, timedelta, timezone

import pytest

from lumora_api.models import Cita
from lumora_api.repositories.appointment_repository import AppointmentRepository


@pytest.mark.asyncio
async def test_repository_detects_overlap_for_patient_or_professional(session_factory):
    async with session_factory() as session:
        start = datetime.now(timezone.utc)
        session.add(Cita(paciente_id=1, profesional_id=2, inicio=start, fin=start + timedelta(hours=1)))
        await session.commit()
        repository = AppointmentRepository(session)
        assert await repository.overlapping(1, 99, start + timedelta(minutes=1), start + timedelta(hours=2))
        assert await repository.overlapping(99, 2, start + timedelta(minutes=1), start + timedelta(hours=2))
