from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from lumora_api.core.security import validate_password_policy


class AccessToken(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    login: Annotated[str, Field(min_length=1, max_length=255)]
    password: Annotated[str, Field(min_length=1, max_length=128)]


class TokenPair(AccessToken):
    refresh_token: str


class LoginTokenResponse(TokenPair):
    mfa_required: Literal[False] = False


class LoginMfaResponse(BaseModel):
    mfa_required: Literal[True] = True
    challenge_token: str
    expires_in: int
    method: str | None = None


class RefreshRequest(BaseModel):
    refresh_token: Annotated[str, Field(min_length=32, max_length=200)]


class SessionRead(BaseModel):
    id: int
    ip: str | None
    user_agent: str | None
    created_at: datetime
    last_used_at: datetime
    expires_at: datetime
    device_name: str
    platform: str
    ip_address: str | None
    last_activity_at: datetime
    is_current: bool
    model_config = ConfigDict(from_attributes=True)


class RegistrationAddress(BaseModel):
    line_1: Annotated[str, Field(min_length=1, max_length=200)]
    city: Annotated[str, Field(min_length=1, max_length=100)]
    department: Annotated[str | None, Field(max_length=100)] = None
    country: Annotated[str, Field(min_length=1, max_length=100)]
    postal_code: Annotated[str | None, Field(max_length=20)] = None


class RegistrationEmergencyContact(BaseModel):
    name: Annotated[str, Field(min_length=1, max_length=150)]
    relationship: Annotated[str, Field(min_length=1, max_length=50)]
    phone: Annotated[str, Field(min_length=5, max_length=30)]


class PatientRegistrationRequest(BaseModel):
    username: Annotated[str, Field(min_length=3, max_length=50)]
    email: EmailStr
    password: Annotated[str, Field(min_length=8, max_length=128)]
    phone: Annotated[str, Field(min_length=5, max_length=30)]
    first_names: Annotated[str, Field(min_length=1, max_length=100)]
    last_names: Annotated[str, Field(min_length=1, max_length=100)]
    birth_date: date
    sex_id: int
    blood_type_id: int | None = None
    address: RegistrationAddress
    emergency_contact: RegistrationEmergencyContact
    accept_terms: Literal[True]
    accept_privacy: Literal[True]

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("password")
    @classmethod
    def strong_password(cls, value: str) -> str:
        return validate_password_policy(value)


class RegistrationResponse(BaseModel):
    user_id: int
    person_id: int
    patient_id: int
    emergency_contact_id: int
    email_verified: bool = False
    status: str = "pending_email_verification"


class RoleAssignment(BaseModel):
    rol_id: int


class PermissionAssignment(BaseModel):
    permiso_id: int


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: Annotated[str, Field(min_length=32, max_length=200)]
    new_password: Annotated[str, Field(min_length=8, max_length=128)]

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, value: str) -> str:
        return validate_password_policy(value)


class VerifyEmailRequest(BaseModel):
    token: Annotated[str, Field(min_length=32, max_length=200)]


class VerifyEmailCodeRequest(BaseModel):
    email: EmailStr
    code: Annotated[str, Field(pattern=r"^\d{6}$")]


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ChangePasswordRequest(BaseModel):
    current_password: Annotated[str, Field(min_length=1, max_length=128)]
    new_password: Annotated[str, Field(min_length=8, max_length=128)]

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, value: str) -> str:
        return validate_password_policy(value)


class MessageResponse(BaseModel):
    message: str
