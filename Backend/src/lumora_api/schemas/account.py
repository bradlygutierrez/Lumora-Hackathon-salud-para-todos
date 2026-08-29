from datetime import date

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AccountAddressRead(BaseModel):
    id: int
    line_1: str
    city: str
    department: str | None = None
    country: str
    postal_code: str | None = None
    is_primary: bool
    model_config = ConfigDict(from_attributes=True)


class AccountPersonRead(BaseModel):
    id: int
    first_names: str
    last_names: str
    birth_date: date | None = None
    phone: str | None = None
    email: EmailStr | None = None
    sex_id: int | None = None
    addresses: list[AccountAddressRead] = Field(default_factory=list)


class AccountRoleRead(BaseModel):
    id: int
    name: str


class AccountRead(BaseModel):
    id: int
    username: str
    email: EmailStr
    email_verified: bool
    profile_image_url: str | None = None
    person: AccountPersonRead
    roles: list[AccountRoleRead]


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


class ProfileImageRead(BaseModel):
    profile_image_url: str | None = None
