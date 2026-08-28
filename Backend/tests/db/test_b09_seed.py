import pytest
from sqlalchemy import select
from lumora_api.db.b09_seed import CAREGIVER_EMAIL, seed_b09, remove_b09
from lumora_api.models import RelacionPaciente, Usuario
@pytest.mark.asyncio
async def test_b09_seed_idempotent_and_removable(session_factory):
    async with session_factory() as s:
        first=await seed_b09(s); second=await seed_b09(s); assert first==second
        assert len(list(await s.scalars(select(RelacionPaciente).where(RelacionPaciente.usuario_relacionado_id==first["caregiver_id"]))))==2
        await remove_b09(s); assert await s.scalar(select(Usuario).where(Usuario.email==CAREGIVER_EMAIL)) is None
