from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

class AffiliationCreate(BaseModel):
    tipo: str = Field(pattern="^(independiente|institucion)$")
    nombre: str = Field(min_length=1, max_length=200)
    correo_contacto: EmailStr
    telefono_contacto: str | None = Field(default=None, max_length=30)
    cupos_comprados: int = Field(ge=1)
    estado: str = Field(default="pending", pattern="^(pending|active|suspended|cancelled)$")
    pago_estado: str = Field(default="pending", pattern="^(pending|paid)$")
    pago_referencia: str | None = Field(default=None, max_length=255)
    cupos_comprados: int | None = Field(default=None, ge=1)
    inicia_en: datetime | None = None
    expira_en: datetime | None = None

    @model_validator(mode="after")
    def validate_seats(self):
        if self.tipo == "independiente" and self.cupos_comprados != 1:
            raise ValueError("Una afiliación independiente requiere exactamente un cupo")
        return self

class AffiliationUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=200)
    correo_contacto: EmailStr | None = None
    telefono_contacto: str | None = Field(default=None, max_length=30)
    estado: str | None = Field(default=None, pattern="^(pending|active|suspended|cancelled)$")
    pago_estado: str | None = Field(default=None, pattern="^(pending|paid)$")
    pago_referencia: str | None = Field(default=None, max_length=255)
    inicia_en: datetime | None = None
    expira_en: datetime | None = None

class ProfessionalProvisionCreate(BaseModel):
    first_names: str = Field(min_length=1, max_length=100)
    last_names: str = Field(min_length=1, max_length=100)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=30)
    birth_date: date | None = None
    sex_id: int | None = None
    especialidad: str = Field(min_length=1, max_length=100)
    numero_licencia: str = Field(min_length=1, max_length=100)
    username: str | None = Field(default=None, min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_.-]+$")

class ProfessionalMembershipUpdate(BaseModel):
    activo: bool

class LicenseVerificationUpdate(BaseModel):
    licencia_verificada: bool

class AffiliationRead(BaseModel):
    id: int; tipo: str; nombre: str; correo_contacto: EmailStr; telefono_contacto: str | None
    cupos_comprados: int; cupos_usados: int; cupos_disponibles: int; estado: str; pago_estado: str; pago_referencia: str | None
    inicia_en: datetime | None; expira_en: datetime | None; created_at: datetime; updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class MembershipRead(BaseModel):
    id: int; afiliacion_id: int; profesional_id: int; activo: bool; joined_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ProvisionedProfessionalRead(BaseModel):
    user_id: int
    professional_id: int
    membership_id: int
    activation_sent: bool

class AffiliationProfessionalRead(BaseModel):
    membership_id: int
    professional_id: int
    user_id: int
    first_names: str
    last_names: str
    email: EmailStr
    especialidad: str
    numero_licencia: str
    licencia_verificada: bool
    membership_activo: bool
    user_activo: bool
    email_verificado: bool | None = None
