from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ApiClientCreate(BaseModel):
    client_id: str = Field(min_length=1, max_length=60, pattern=r"^[a-z0-9][a-z0-9-]*$")
    nombre: str = Field(min_length=1, max_length=120)


class ApiClientUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=120)
    activo: bool | None = None


class ApiClientRead(BaseModel):
    id: int
    client_id: str
    nombre: str
    activo: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ApiClientSelfRead(BaseModel):
    client_id: str
    nombre: str
    activo: bool
    model_config = ConfigDict(from_attributes=True)


class ApiClientKeyRead(BaseModel):
    id: int
    key_prefix: str
    activa: bool
    created_at: datetime
    revoked_at: datetime | None
    last_used_at: datetime | None
    model_config = ConfigDict(from_attributes=True)


class ApiClientKeyIssuedRead(ApiClientKeyRead):
    api_key: str
