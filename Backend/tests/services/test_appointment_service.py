from datetime import datetime, time, timedelta, timezone
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from lumora_api.schemas.appointments import AppointmentCreate
from lumora_api.services.appointment_service import AppointmentService


def test_schema_rejects_invalid_and_overlong_periods():
    now = datetime.now(timezone.utc)
    with pytest.raises(ValidationError):
        AppointmentCreate(paciente_id=1, profesional_id=1, inicio=now, fin=now)
    with pytest.raises(ValidationError):
        AppointmentCreate(paciente_id=1, profesional_id=1, inicio=now, fin=now + timedelta(hours=13))


class AvailabilityRepositoryStub:
    def __init__(self) -> None:
        self.session = self
        self.requested_days: list[int] = []
        self.occupied_calls = 0

    async def get(self, _model, _item_id):
        return SimpleNamespace(deleted_at=None)

    async def schedules(self, _professional_id: int, day: int):
        self.requested_days.append(day)
        return [
            SimpleNamespace(
                hora_inicio=time(8),
                hora_fin=time(9),
            )
        ]

    async def occupied(self, *_args):
        self.occupied_calls += 1
        return []


@pytest.mark.asyncio
async def test_availability_uses_monday_zero_and_disables_past_slots():
    repository = AvailabilityRepositoryStub()
    service = AppointmentService(repository)
    today = datetime.now(timezone.utc).date()
    days_until_sunday = (6 - today.weekday()) % 7 or 7
    sunday = today + timedelta(days=days_until_sunday)

    future = await service.availability(1, sunday)
    past = await service.availability(1, today - timedelta(days=1))

    assert repository.requested_days == [6, (today - timedelta(days=1)).weekday()]
    assert future.slots[0].inicio.date() == sunday
    assert future.slots[0].disponible is True
    assert past.slots[0].disponible is False
    assert repository.occupied_calls == 1
