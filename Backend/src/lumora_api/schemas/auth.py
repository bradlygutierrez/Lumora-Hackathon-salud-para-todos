from typing import Annotated

from pydantic import BaseModel, EmailStr, Field


class AccessToken(BaseModel):
    access_token: str
    token_type: str = "bearer"


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
