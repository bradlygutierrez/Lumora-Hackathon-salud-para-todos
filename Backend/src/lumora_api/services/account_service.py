from sqlalchemy.exc import IntegrityError

from lumora_api.core.exceptions import ResourceConflictError, ResourceNotFoundError
from lumora_api.models import Usuario
from lumora_api.repositories.account_repository import AccountRepository
from lumora_api.services.profile_image_storage import ProfileImageStorage


class AccountService:
    def __init__(self, repository: AccountRepository, storage: ProfileImageStorage | None = None) -> None:
        self.repository = repository
        self.storage = storage

    async def get(self, user_id: int) -> Usuario:
        user = await self.repository.get(user_id)
        if user is None:
            raise ResourceNotFoundError("Usuario no existe")
        return user

    async def update(self, user_id: int, data) -> Usuario:
        user = await self.get(user_id)
        values = data.model_dump(exclude_unset=True, exclude={"person"})
        if "username" in values:
            values["username"] = values["username"].lower()
            if await self.repository.username_taken(values["username"], user_id):
                raise ResourceConflictError("El nombre de usuario ya existe")
        if "email" in values:
            values["email"] = str(values["email"]).lower()
            if await self.repository.email_taken(values["email"], user_id):
                raise ResourceConflictError("El correo ya existe")
            user.persona.email = values["email"]
        for field, value in values.items():
            setattr(user, field, value)
        if data.person is not None:
            person = data.person.model_dump(exclude_unset=True)
            if "first_names" in person:
                user.persona.nombres = person.pop("first_names")
            if "last_names" in person:
                user.persona.apellidos = person.pop("last_names")
            if "birth_date" in person:
                user.persona.fecha_nacimiento = person.pop("birth_date")
            if "phone" in person:
                user.persona.telefono = person.pop("phone")
            if "sex_id" in person:
                if person["sex_id"] is not None and not await self.repository.sex_exists(person["sex_id"]):
                    raise ResourceNotFoundError("Sexo no existe")
                user.persona.sexo_id = person.pop("sex_id")
        try:
            await self.repository.session.commit()
        except IntegrityError as error:
            await self.repository.session.rollback()
            raise ResourceConflictError("El correo o nombre de usuario ya existe") from error
        return await self.get(user_id)

    async def set_image(self, user_id: int, content: bytes, extension: str) -> Usuario:
        user = await self.get(user_id)
        if self.storage is None:
            raise RuntimeError("Profile image storage is not configured")
        old = user.persona.profile_image_url
        user.persona.profile_image_url = await self.storage.save(content, extension)
        await self.repository.session.commit()
        if old:
            await self.storage.delete(old)
        return await self.get(user_id)

    async def delete_image(self, user_id: int) -> Usuario:
        user = await self.get(user_id)
        old = user.persona.profile_image_url
        user.persona.profile_image_url = None
        await self.repository.session.commit()
        if old and self.storage:
            await self.storage.delete(old)
        return await self.get(user_id)
