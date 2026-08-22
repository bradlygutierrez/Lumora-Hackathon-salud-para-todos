from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AccessToken(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    login: Annotated[str, Field(min_length=1, max_length=255)]
    password: Annotated[str, Field(min_length=1, max_length=128)]


class TokenPair(AccessToken):
    refresh_token: str


class RefreshRequest(BaseModel):
    refresh_token: Annotated[str, Field(min_length=32, max_length=200)]


class SessionRead(BaseModel):
    id: int
    ip: str | None
    user_agent: str | None
    created_at: datetime
    last_used_at: datetime
    expires_at: datetime
    model_config = ConfigDict(from_attributes=True)


class RoleAssignment(BaseModel):
    rol_id: int


class PermissionAssignment(BaseModel):
    permiso_id: int


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: Annotated[str, Field(min_length=32, max_length=200)]
    new_password: Annotated[str, Field(min_length=8, max_length=128)]


class VerifyEmailRequest(BaseModel):
    token: Annotated[str, Field(min_length=32, max_length=200)]


class MessageResponse(BaseModel):
    message: str
