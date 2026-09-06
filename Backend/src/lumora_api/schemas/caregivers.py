from pydantic import BaseModel


class LinkedPatientSummary(BaseModel):
    id: int
    first_names: str
    last_names: str


class CaregiverPatientRead(BaseModel):
    patient_id: int
    relationship: str
    status: str
    access_level: str
    patient: LinkedPatientSummary


class CaregiverPatientList(BaseModel):
    items: list[CaregiverPatientRead]
from pydantic import BaseModel


class LinkedPatientSummary(BaseModel):
    id: int
    first_names: str
    last_names: str


class CaregiverPatientRead(BaseModel):
    patient_id: int
    relationship: str
    status: str
    access_level: str
    patient: LinkedPatientSummary


class CaregiverPatientList(BaseModel):
    items: list[CaregiverPatientRead]
