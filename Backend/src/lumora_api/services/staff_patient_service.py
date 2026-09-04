from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from lumora_api.core.exceptions import ResourceConflictError, ResourceNotFoundError
from lumora_api.models import (
    ConsultaMedica,
    ContactoEmergencia,
    Direccion,
    EstadoExpediente,
    Expediente,
    Paciente,
    Persona,
    Usuario,
)
from lumora_api.repositories.patient_repository import PatientRepository
from lumora_api.schemas.identity import (
    EmergencyPatientRegistrationCreate,
    StaffPatientRegistrationCreate,
)
from lumora_api.services.authorization import resolve_current_professional


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

    async def register_emergency(
        self, data: EmergencyPatientRegistrationCreate, current_user: Usuario
    ) -> dict:
        """Alta rápida de un paciente que llega en emergencia: solo nombre y
        apellido son obligatorios, el contacto de emergencia es opcional, y
        de una vez se abre el expediente y se registra la primera consulta
        -- todo en la misma transacción, para que el personal no tenga que
        pasar por el alta completa (dirección, tipo de sangre, etc.) antes
        de poder atender al paciente.
        """
        professional = await resolve_current_professional(self.repository.session, current_user)

        person = Persona(**data.persona.model_dump(exclude={"direcciones"}))
        # Se inicializan vacías a propósito (en vez de dejarlas sin tocar):
        # de lo contrario, el lazy-load de estas relaciones falla al
        # serializar la respuesta fuera del greenlet async de SQLAlchemy.
        person.direcciones = []
        patient = Paciente(persona=person)
        patient.contactos_emergencia = (
            [ContactoEmergencia(**data.contacto_emergencia.model_dump())]
            if data.contacto_emergencia is not None
            else []
        )
        self.repository.session.add(patient)
        await self.repository.session.flush()

        estado_activo = await self.repository.session.scalar(
            select(EstadoExpediente).where(EstadoExpediente.nombre == "Activo")
        )
        if estado_activo is None:
            raise ResourceNotFoundError(
                "No existe el estado de expediente 'Activo'; falta correr el seed"
            )
        record = Expediente(
            paciente_id=patient.id,
            estado_expediente_id=estado_activo.id,
            # Único y generado acá porque en una emergencia el personal no
            # trae un número de expediente preparado de antemano.
            numero_expediente=f"EMG-{uuid4().hex[:10].upper()}",
        )
        self.repository.session.add(record)
        await self.repository.session.flush()

        consultation = ConsultaMedica(
            expediente_id=record.id,
            paciente_id=patient.id,
            profesional_id=professional.id,
            motivo=data.motivo_consulta,
        )
        self.repository.session.add(consultation)

        try:
            await self.repository.session.commit()
        except IntegrityError as error:
            await self.repository.session.rollback()
            raise ResourceConflictError(
                "No se pudo registrar la atención de emergencia"
            ) from error

        await self.repository.session.refresh(patient)
        return {
            "paciente": patient,
            "expediente_id": record.id,
            "consulta_id": consultation.id,
        }

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
