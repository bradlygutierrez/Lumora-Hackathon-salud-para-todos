from datetime import datetime, timezone
from sqlalchemy import select
from lumora_api.models import Usuario
from lumora_api.repositories.mfa_repository import MfaRepository

async def reset_user_mfa(session, identifier: str) -> int:
    user = await session.scalar(select(Usuario).where((Usuario.email == identifier.lower()) | (Usuario.username == identifier.lower())))
    if user is None: raise ValueError("User not found")
    repo = MfaRepository(session); methods = await repo.configured_methods(user.id); now = datetime.now(timezone.utc)
    for method in methods:
        method.activo = False; method.disabled_at = now; method.secreto_cifrado = ""
        await repo.delete_recovery_codes(method.id); await repo.consume_open_challenges(method.id)
    await session.commit(); return len(methods)
