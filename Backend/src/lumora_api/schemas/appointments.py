from datetime import datetime, timedelta

from pydantic import BaseModel, ConfigDict, Field, model_validator


class AppointmentBase(BaseModel):
    paciente_id: int
    profesional_id: int
    tipo_cita_id: int | None = None
    estado_cita_id: int | None = None
    inicio: datetime
    fin: datetime
    notas: str | None = Field(default=None, max_length=4000)

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


class ProfessionalSummary(BaseModel):
    id: int
    full_name: str
    specialty: str


class AppointmentRead(AppointmentBase):
    id: int
    created_at: datetime
    updated_at: datetime
    professional: ProfessionalSummary | None = None
    model_config = ConfigDict(from_attributes=True)
