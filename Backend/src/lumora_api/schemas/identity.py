from datetime import date
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field

ShortText = Annotated[str, Field(min_length=1, max_length=100)]


class AddressCreate(BaseModel):
    linea_1: Annotated[str, Field(min_length=1, max_length=200)]
    ciudad: ShortText
    departamento: str | None = Field(default=None, max_length=100)
    pais: str = Field(default="Nicaragua", min_length=1, max_length=100)
    codigo_postal: str | None = Field(default=None, max_length=20)
    es_principal: bool = False


class AddressRead(AddressCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class PersonCreate(BaseModel):
    nombres: ShortText
    apellidos: ShortText
    fecha_nacimiento: date | None = None
    telefono: str | None = Field(default=None, max_length=30)
    sexo_id: int | None = None
    direcciones: list[AddressCreate] = Field(default_factory=list)


class PersonUpdate(BaseModel):
    nombres: ShortText | None = None
    apellidos: ShortText | None = None
    fecha_nacimiento: date | None = None
    telefono: str | None = Field(default=None, max_length=30)
    sexo_id: int | None = None


class PersonRead(BaseModel):
    id: int
    nombres: str
    apellidos: str
    fecha_nacimiento: date | None
    telefono: str | None
    sexo_id: int | None
    direcciones: list[AddressRead] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    email: EmailStr
    username: Annotated[str, Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_.-]+$")]
    password: Annotated[str, Field(min_length=8, max_length=128)]
    persona: PersonCreate


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    username: Annotated[str, Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_.-]+$")] | None = None
    password: Annotated[str, Field(min_length=8, max_length=128)] | None = None
    activo: bool | None = None
    persona: PersonUpdate | None = None


class UserRead(BaseModel):
    id: int
    email: EmailStr
    username: str
    activo: bool
    email_verificado: bool
    persona: PersonRead
    roles: list["RoleRead"] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)


class PatientCreate(BaseModel):
    persona_id: int
    tipo_sangre_id: int | None = None
    alergias: str | None = Field(default=None, max_length=2000)


class PatientUpdate(BaseModel):
    tipo_sangre_id: int | None = None
    alergias: str | None = Field(default=None, max_length=2000)
    persona: PersonUpdate | None = None


class PatientRead(BaseModel):
    id: int
    tipo_sangre_id: int | None
    alergias: str | None
    persona: PersonRead
    model_config = ConfigDict(from_attributes=True)


class ProfessionalCreate(BaseModel):
    persona_id: int
    especialidad: ShortText
    numero_licencia: ShortText


class ProfessionalUpdate(BaseModel):
    especialidad: ShortText | None = None
    numero_licencia: ShortText | None = None
    persona: PersonUpdate | None = None


class ProfessionalRead(BaseModel):
    id: int
    especialidad: str
    numero_licencia: str
    persona: PersonRead
    model_config = ConfigDict(from_attributes=True)


class EmergencyContactCreate(BaseModel):
    nombre: Annotated[str, Field(min_length=1, max_length=150)]
    parentesco: Annotated[str, Field(min_length=1, max_length=50)]
    telefono: Annotated[str, Field(min_length=1, max_length=30)]
    email: EmailStr | None = None


class EmergencyContactUpdate(BaseModel):
    nombre: Annotated[str, Field(min_length=1, max_length=150)] | None = None
    parentesco: Annotated[str, Field(min_length=1, max_length=50)] | None = None
    telefono: Annotated[str, Field(min_length=1, max_length=30)] | None = None
    email: EmailStr | None = None


class EmergencyContactRead(EmergencyContactCreate):
    id: int
    paciente_id: int
    model_config = ConfigDict(from_attributes=True)


from lumora_api.schemas.catalogs import RoleRead

UserRead.model_rebuild()
