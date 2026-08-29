from datetime import date, datetime, timedelta

from pydantic import BaseModel, ConfigDict, Field, model_validator

from lumora_api.schemas.catalogs import CatalogRead


class AppointmentBase(BaseModel):
    paciente_id: int
    profesional_id: int
    tipo_cita_id: int | None = None
    estado_cita_id: int | None = None
    inicio: datetime
    fin: datetime
    notas: str | None = Field(default=None, max_length=4000)
    ubicacion_id: int | None = None

    @model_validator(mode="after")
    def valid_period(self):
        if self.inicio >= self.fin:
            raise ValueError("inicio debe ser menor que fin")
        if self.fin - self.inicio > timedelta(hours=12):
            raise ValueError("la duración máxima es de 12 horas")
        return self


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    paciente_id: int | None = None
    profesional_id: int | None = None
    tipo_cita_id: int | None = None
    estado_cita_id: int | None = None
    inicio: datetime | None = None
    fin: datetime | None = None
    notas: str | None = Field(default=None, max_length=4000)


class AppointmentReschedule(BaseModel):
    model_config = ConfigDict(extra="forbid")
    inicio: datetime
    fin: datetime

    @model_validator(mode="after")
    def valid_period(self):
        if self.inicio >= self.fin:
            raise ValueError("inicio debe ser menor que fin")
        if self.fin - self.inicio > timedelta(hours=12):
            raise ValueError("la duración máxima es de 12 horas")
        return self


class ProfessionalSummary(BaseModel):
    id: int
    full_name: str
    specialty: str
    profile_image_url: str | None = None


class AppointmentRead(AppointmentBase):
    id: int
    created_at: datetime
    updated_at: datetime
    professional: ProfessionalSummary | None = None
    status: CatalogRead | None = None
    appointment_type: CatalogRead | None = None
    location: "AppointmentLocationRead | None" = None
    model_config = ConfigDict(from_attributes=True)


class AppointmentLocationRead(BaseModel):
    id: int
    nombre: str
    direccion: str
    consultorio: str | None = None
    latitud: float | None = None
    longitud: float | None = None
    model_config = ConfigDict(from_attributes=True)


class AvailabilitySlotRead(BaseModel):
    inicio: datetime
    fin: datetime
    disponible: bool = True


class AvailabilityRead(BaseModel):
    profesional_id: int
    fecha: date
    slots: list[AvailabilitySlotRead]


class AppointmentCancellation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    motivo: str | None = Field(default=None, max_length=500)
