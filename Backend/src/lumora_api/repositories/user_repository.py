from sqlalchemy.ext.asyncio import AsyncSession

from lumora_api.models import Usuario
from lumora_api.repositories.identity_repository import IdentityRepository


class UserRepository(IdentityRepository[Usuario]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Usuario)
