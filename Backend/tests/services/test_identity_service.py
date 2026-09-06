import pytest

from lumora_api.core.exceptions import ResourceNotFoundError
from lumora_api.core.security import verify_password
from lumora_api.models import Rol
from lumora_api.repositories.user_repository import UserRepository
from lumora_api.schemas import UserCreate
from lumora_api.services.identity_service import UserService


@pytest.mark.asyncio
async def test_user_service_hashes_password_and_validates_role(session_factory):
    async with session_factory() as session:
        service = UserService(UserRepository(session))
        data = UserCreate(
            email="ana@example.com",
            username="ana",
            password="safe-password",
            rol_id=999,
            persona={"nombres": "Ana", "apellidos": "López"},
        )
        with pytest.raises(ResourceNotFoundError):
            await service.create(data)

        role = Rol(nombre="Paciente")
        session.add(role)
        await session.commit()
        user = await service.create(data.model_copy(update={"rol_id": role.id}))

        assert verify_password("safe-password", user.password_hash)
