from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError

from lumora_api.core.exceptions import ResourceConflictError, ResourceNotFoundError
from lumora_api.core.security import hash_password
from lumora_api.models import (
    ContactoEmergencia,
    Direccion,
    Paciente,
    Persona,
    ProfesionalSalud,
    Rol,
    Usuario,
)
from lumora_api.repositories.identity_repository import IdentityRepository
from lumora_api.repositories.contact_repository import ContactRepository
from lumora_api.repositories.user_repository import UserRepository
from lumora_api.schemas.identity import (
    EmergencyContactCreate,
    EmergencyContactUpdate,
    PatientCreate,
    PatientUpdate,
    ProfessionalCreate,
    ProfessionalUpdate,
    UserCreate,
    UserUpdate,
)


async def _commit(repository: IdentityRepository, message: str):
    try:
        await repository.session.commit()
    except IntegrityError as error:
        await repository.session.rollback()
        raise ResourceConflictError(message) from error


class IdentityService:
    resource_name = "Recurso"

    def __init__(self, repository: IdentityRepository) -> None:
        self.repository = repository

    async def list(self, limit: int, offset: int):
        return await self.repository.list(limit, offset)

    async def get(self, item_id: int):
        item = await self.repository.get(item_id)
        if item is None:
            raise ResourceNotFoundError(f"{self.resource_name} con id {item_id} no existe")
        return item

    async def delete(self, item_id: int) -> None:
        await self.repository.soft_delete(await self.get(item_id))
        await self.repository.session.commit()

    async def _person(self, person_id: int) -> Persona:
        person = await IdentityRepository(self.repository.session, Persona).get(person_id)
        if person is None:
            raise ResourceNotFoundError(f"Persona con id {person_id} no existe")
        return person

    async def _update_person(self, person: Persona, data: BaseModel | None) -> None:
        if data is not None:
            await IdentityRepository(self.repository.session, Persona).update(
                person, data.model_dump(exclude_unset=True)
            )


class UserService(IdentityService):
    resource_name = "Usuario"

    def __init__(self, repository: UserRepository) -> None:
        super().__init__(repository)

    async def create(self, data: UserCreate) -> Usuario:
        if await self.repository.session.get(Rol, data.rol_id) is None:
            raise ResourceNotFoundError(f"Rol con id {data.rol_id} no existe")
        person_values = data.persona.model_dump(exclude={"direcciones"})
        person = Persona(**person_values)
        person.direcciones = [
            Direccion(**address.model_dump()) for address in data.persona.direcciones
        ]
        user = await self.repository.create(
            {
                "persona": person,
                "rol_id": data.rol_id,
                "email": str(data.email).lower(),
                "username": data.username.lower(),
                "password_hash": hash_password(data.password),
            }
        )
        await _commit(self.repository, "El correo o nombre de usuario ya existe")
        return user

    async def update(self, item_id: int, data: UserUpdate) -> Usuario:
        user = await self.get(item_id)
        values = data.model_dump(exclude_unset=True, exclude={"persona", "password"})
        if "email" in values:
            values["email"] = str(values["email"]).lower()
        if "username" in values:
            values["username"] = values["username"].lower()
        if data.password is not None:
            values["password_hash"] = hash_password(data.password)
        await self._update_person(user.persona, data.persona)
        await self.repository.update(user, values)
        await _commit(self.repository, "El correo o nombre de usuario ya existe")
        return user

    async def delete(self, item_id: int) -> None:
        user = await self.get(item_id)
        user.activo = False
        await self.repository.soft_delete(user)
        await self.repository.session.commit()


class PatientService(IdentityService):
    resource_name = "Paciente"

    async def create(self, data: PatientCreate) -> Paciente:
        person = await self._person(data.persona_id)
        patient = await self.repository.create(
            {**data.model_dump(exclude={"persona_id"}), "persona": person}
        )
        await _commit(self.repository, "La persona ya tiene un perfil de paciente")
        return patient

    async def update(self, item_id: int, data: PatientUpdate) -> Paciente:
        patient = await self.get(item_id)
        await self._update_person(patient.persona, data.persona)
        await self.repository.update(
            patient, data.model_dump(exclude_unset=True, exclude={"persona"})
        )
        await _commit(self.repository, "No se pudo actualizar el paciente")
        return patient


class ProfessionalService(IdentityService):
    resource_name = "Profesional"

    async def create(self, data: ProfessionalCreate) -> ProfesionalSalud:
        person = await self._person(data.persona_id)
        professional = await self.repository.create(
            {**data.model_dump(exclude={"persona_id"}), "persona": person}
        )
        await _commit(
            self.repository, "La persona o número de licencia ya está registrado"
        )
        return professional

    async def update(
        self, item_id: int, data: ProfessionalUpdate
    ) -> ProfesionalSalud:
        professional = await self.get(item_id)
        await self._update_person(professional.persona, data.persona)
        await self.repository.update(
            professional, data.model_dump(exclude_unset=True, exclude={"persona"})
        )
        await _commit(self.repository, "El número de licencia ya está registrado")
        return professional


class EmergencyContactService(IdentityService):
    resource_name = "Contacto de emergencia"

    def __init__(self, repository: ContactRepository) -> None:
        super().__init__(repository)
        self.repository = repository

    async def _patient(self, patient_id: int) -> Paciente:
        patient = await IdentityRepository(self.repository.session, Paciente).get(patient_id)
        if patient is None:
            raise ResourceNotFoundError(f"Paciente con id {patient_id} no existe")
        return patient

    async def list_for_patient(self, patient_id: int, limit: int, offset: int):
        await self._patient(patient_id)
        return await self.repository.list_for_patient(patient_id, limit, offset)

    async def get_for_patient(self, patient_id: int, contact_id: int) -> ContactoEmergencia:
        await self._patient(patient_id)
        contact = await self.repository.get(contact_id)
        if contact is None or contact.paciente_id != patient_id:
            raise ResourceNotFoundError(
                f"Contacto de emergencia con id {contact_id} no existe"
            )
        return contact

    async def create_for_patient(
        self, patient_id: int, data: EmergencyContactCreate
    ) -> ContactoEmergencia:
        await self._patient(patient_id)
        contact = await self.repository.create(
            {"paciente_id": patient_id, **data.model_dump(mode="json")}
        )
        await self.repository.session.commit()
        return contact

    async def update_for_patient(
        self, patient_id: int, contact_id: int, data: EmergencyContactUpdate
    ) -> ContactoEmergencia:
        contact = await self.get_for_patient(patient_id, contact_id)
        await self.repository.update(contact, data.model_dump(exclude_unset=True, mode="json"))
        await self.repository.session.commit()
        return contact

    async def delete_for_patient(self, patient_id: int, contact_id: int) -> None:
        await self.repository.soft_delete(
            await self.get_for_patient(patient_id, contact_id)
        )
        await self.repository.session.commit()
