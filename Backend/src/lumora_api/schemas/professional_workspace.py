from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field, model_validator

from lumora_api.schemas.appointments import AppointmentLocationRead
from lumora_api.schemas.catalogs import CatalogRead
from lumora_api.schemas.clinical import ConsultationRead
from lumora_api.schemas.identity import PatientRead


class ProfessionalScheduleBase(BaseModel):
    dia_semana: int = Field(..., ge=0, le=6)
    hora_inicio: time
    hora_fin: time
    activo: bool = True

    @model_validator(mode="after")
    def validate_period(self):
        if self.hora_inicio >= self.hora_fin:
            raise ValueError("hora_inicio debe ser menor que hora_fin")
        return self


class ProfessionalScheduleCreate(ProfessionalScheduleBase):
    pass


class ProfessionalScheduleUpdate(BaseModel):
    dia_semana: int | None = Field(default=None, ge=0, le=6)
    hora_inicio: time | None = None
    hora_fin: time | None = None
    activo: bool | None = None


class ProfessionalScheduleRead(ProfessionalScheduleBase):
    id: int
    profesional_id: int
    model_config = ConfigDict(from_attributes=True)


class ProfessionalAgendaItemRead(BaseModel):
    id: int
    paciente_id: int
    paciente_nombre: str
    inicio: datetime
    fin: datetime
    notas: str | None = None
    estado: CatalogRead | None = None
    tipo_cita: CatalogRead | None = None
    ubicacion: AppointmentLocationRead | None = None


class ProfessionalAvailabilitySlotRead(BaseModel):
    inicio: datetime
    fin: datetime
    disponible: bool


class ProfessionalAvailabilityRead(BaseModel):
    fecha: date
    slots: list[ProfessionalAvailabilitySlotRead]


class MyPatientRead(BaseModel):
    paciente: PatientRead
    proxima_cita: ProfessionalAgendaItemRead | None = None
    ultima_consulta: ConsultationRead | None = None
