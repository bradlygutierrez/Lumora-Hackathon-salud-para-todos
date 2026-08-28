from datetime import date
from pydantic import BaseModel
class AllergySummaryRead(BaseModel):
    id: int
    name: str
    description: str | None = None
    severity: str | None = None
    active: bool
class ConditionSummaryRead(BaseModel):
    id: int
    name: str
    description: str | None = None
    diagnosed_at: date | None = None
    status: str | None = None
class HealthSummaryRead(BaseModel):
    patient_id: int
    allergies: list[AllergySummaryRead]
    active_conditions: list[ConditionSummaryRead]
