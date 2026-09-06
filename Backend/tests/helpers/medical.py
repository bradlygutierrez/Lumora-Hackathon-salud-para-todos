from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from lumora_api.core.security import hash_password

from lumora_api.models import (
    AfiliacionMedica,
    AfiliacionProfesional,
    Permiso,
    Persona,
    ProfesionalSalud,
    Rol,
    Usuario,
)


async def create_active_medical_professional(
    session,
    *,
    user: Usuario | None = None,
    professional: ProfesionalSalud | None = None,
    username: str = "medical-test",
    email: str | None = None,
    license_number: str | None = None,
    license_verified: bool = True,
    payment_status: str = "paid",
    affiliation_status: str = "active",
    membership_active: bool = True,
    expires_at: datetime | None = None,
    seats: int = 1,
    tipo: str = "institucion",
) -> dict[str, object]:
    """Create the complete operational context for a genuine medical actor."""
    if user is None:
        user = Usuario(
            persona=Persona(nombres="Test", apellidos="Medical"),
            email=email or f"{username}@example.com",
            username=username,
            password_hash=hash_password("safe-password"),
        )
        session.add(user)
        await session.flush()
    if professional is None:
        professional = ProfesionalSalud(
            persona_id=user.persona_id,
            especialidad="Medicina general",
            numero_licencia=license_number or f"TEST-{user.id}",
        )
        session.add(professional)
    professional.licencia_verificada = license_verified
    permission = await session.scalar(select(Permiso).where(Permiso.nombre == "clinica:manage"))
    if permission is None:
        permission = Permiso(nombre="clinica:manage")
        session.add(permission)
        await session.flush()
    role = await session.scalar(select(Rol).where(Rol.nombre == "Profesional de Salud"))
    if role is None:
        role = Rol(nombre="Profesional de Salud", permisos=[permission])
        session.add(role)
    elif permission not in role.permisos:
        role.permisos.append(permission)
    if user is not None:
        await session.refresh(user, ['roles'])
    if user is not None and role not in user.roles:
        user.roles.append(role)
    await session.flush()
    affiliation = AfiliacionMedica(
        tipo=tipo,
        nombre="Test medical affiliation",
        correo_contacto="qa@lumora.example",
        cupos_comprados=seats,
        estado=affiliation_status,
        pago_estado=payment_status,
        expira_en=expires_at if expires_at is not None else datetime.now(timezone.utc) + timedelta(days=30),
    )
    membership = AfiliacionProfesional(
        afiliacion=affiliation,
        profesional=professional,
        activo=membership_active,
    )
    session.add(membership)
    await session.flush()
    return {"user": user, "person": user.persona, "professional": professional, "affiliation": affiliation, "membership": membership}
