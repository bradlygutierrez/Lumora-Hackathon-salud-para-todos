from typing import Annotated

from pydantic import BaseModel, Field


class MfaMethodRead(BaseModel):
    id: int | None
    metodo_id: int
    nombre: str
    activo: bool


class MfaSetupRequest(BaseModel):
    metodo_id: int


class MfaSetupResponse(BaseModel):
    method_id: int
    secret: str
    provisioning_uri: str
    recovery_codes: list[str]


class MfaChallengeRequest(BaseModel):
    username: str
    password: str


class MfaChallengeResponse(BaseModel):
    challenge_token: str
    expires_in: int


class MfaVerifyRequest(BaseModel):
    challenge_token: Annotated[str, Field(min_length=32, max_length=200)]
    code: Annotated[str, Field(pattern=r"^\d{6}$")]


class MfaRecoveryRequest(BaseModel):
    challenge_token: Annotated[str, Field(min_length=32, max_length=200)]
    recovery_code: Annotated[str, Field(min_length=8, max_length=100)]
