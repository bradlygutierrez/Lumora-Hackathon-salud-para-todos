from datetime import datetime, timedelta, timezone

import pytest
from pydantic import ValidationError

from lumora_api.schemas.appointments import AppointmentCreate


def test_schema_rejects_invalid_and_overlong_periods():
    now = datetime.now(timezone.utc)
    with pytest.raises(ValidationError):
        AppointmentCreate(paciente_id=1, profesional_id=1, inicio=now, fin=now)
    with pytest.raises(ValidationError):
        AppointmentCreate(paciente_id=1, profesional_id=1, inicio=now, fin=now + timedelta(hours=13))
