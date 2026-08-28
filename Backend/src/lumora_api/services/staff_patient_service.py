from sqlalchemy.exc import IntegrityError

from lumora_api.core.exceptions import ResourceConflictError
from lumora_api.models import ContactoEmergencia, Direccion, Paciente, Persona
from lumora_api.repositories.patient_repository import PatientRepository
from lumora_api.schemas.identity import StaffPatientRegistrationCreate


class StaffPatientService:
    def __init__(self, repository: PatientRepository) -> None:
        self.repository = repository

    async def list_filtered(
        self,
        *,
        search: str | None,
        sexo_id: int | None,
        tipo_sangre_id: int | None,
        limit: int,
        offset: int,
    ):
        return await self.repository.list_filtered(
            search=search,
            sexo_id=sexo_id,
            tipo_sangre_id=tipo_sangre_id,
            limit=limit,
            offset=offset,
        )

    async def register(self, data: StaffPatientRegistrationCreate) -> Paciente:
        person_values = data.persona.model_dump(exclude={"direccion"})
        if person_values.get("email") is not None:
            person_values["email"] = str(person_values["email"]).lower()

        person = Persona(**person_values)
        person.direcciones = [Direccion(**data.persona.direccion.model_dump())]
        patient = Paciente(
            persona=person,
            tipo_sangre_id=data.tipo_sangre_id,
            alergias=data.alergias,
        )
        patient.contactos_emergencia = [
            ContactoEmergencia(**data.contacto_emergencia.model_dump())
        ]
        self.repository.session.add(patient)
        try:
            await self.repository.session.commit()
        except IntegrityError as error:
            await self.repository.session.rollback()
            raise ResourceConflictError("No se pudo registrar el paciente") from error
        return patient

    async def family(self, patient_id: int):
        relationships = await self.repository.family_relationships(patient_id)
        return [
            {
                "id": item.id,
                "usuario_relacionado_id": item.usuario_relacionado_id,
                "nombres": item.usuario_relacionado.persona.nombres,
                "apellidos": item.usuario_relacionado.persona.apellidos,
                "tipo_relacion_id": item.tipo_relacion_id,
                "tipo_relacion": item.tipo_relacion.nombre,
                "recibir_notificaciones": item.recibir_notificaciones,
                "estado": item.estado,
                "nivel_acceso": item.nivel_acceso,
                "expira_en": item.expira_en,
            }
            for item in relationships
        ]
