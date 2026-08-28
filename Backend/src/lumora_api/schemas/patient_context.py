from pydantic import BaseModel, EmailStr


class PermissionSummary(BaseModel):
    id: int
    nombre: str


class RoleSummary(BaseModel):
    id: int
    nombre: str
    permisos: list[PermissionSummary]


class PersonSummary(BaseModel):
    id: int
    nombres: str
    apellidos: str


class CurrentUserRead(BaseModel):
    id: int
    email: EmailStr
    username: str
    activo: bool
    email_verificado: bool
    roles: list[RoleSummary]
    persona: PersonSummary


class PatientContextRead(BaseModel):
    patient_id: int
    first_names: str
    last_names: str
