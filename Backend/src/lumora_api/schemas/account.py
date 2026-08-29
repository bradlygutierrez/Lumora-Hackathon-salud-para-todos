from datetime import date

from pydantic import AliasPath, BaseModel, ConfigDict, EmailStr, Field, field_validator


class AccountAddressRead(BaseModel):
    id: int
    line_1: str = Field(validation_alias="linea_1")
    city: str = Field(validation_alias="ciudad")
    department: str | None = Field(default=None, validation_alias="departamento")
    country: str = Field(validation_alias="pais")
    postal_code: str | None = Field(default=None, validation_alias="codigo_postal")
    is_primary: bool = Field(validation_alias="es_principal")
    model_config = ConfigDict(from_attributes=True)


class AccountPersonRead(BaseModel):
    id: int
    first_names: str = Field(validation_alias="nombres")
    last_names: str = Field(validation_alias="apellidos")
    birth_date: date | None = Field(default=None, validation_alias="fecha_nacimiento")
    phone: str | None = Field(default=None, validation_alias="telefono")
    email: EmailStr | None = None
    sex_id: int | None = Field(default=None, validation_alias="sexo_id")
    addresses: list[AccountAddressRead] = Field(default_factory=list, validation_alias="direcciones")
    model_config = ConfigDict(from_attributes=True)


class AccountRoleRead(BaseModel):
    id: int
    name: str = Field(validation_alias="nombre")
    model_config = ConfigDict(from_attributes=True)


class AccountRead(BaseModel):
    id: int
    username: str
    email: EmailStr
    email_verified: bool = Field(validation_alias="email_verificado")
    profile_image_url: str | None = Field(default=None, validation_alias=AliasPath("persona", "profile_image_url"))
    person: AccountPersonRead = Field(validation_alias="persona")
    roles: list[AccountRoleRead]
    model_config = ConfigDict(from_attributes=True)


class AccountPersonUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    first_names: str | None = Field(default=None, min_length=1, max_length=100)
    last_names: str | None = Field(default=None, min_length=1, max_length=100)
    birth_date: date | None = None
    phone: str | None = Field(default=None, max_length=30)
    sex_id: int | None = None


class AccountUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    username: str | None = Field(default=None, min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_.-]+$")
    email: EmailStr | None = None
    person: AccountPersonUpdate | None = None

    @field_validator("username", mode="before")
    @classmethod
    def normalize_username(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value


class ProfileImageRead(BaseModel):
    profile_image_url: str | None = None
