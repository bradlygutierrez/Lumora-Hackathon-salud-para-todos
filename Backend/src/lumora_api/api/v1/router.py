from fastapi import APIRouter

from lumora_api.api.v1 import (
    emergency_contacts,
    auth,
    estados_cita,
    patients,
    permisos,
    professionals,
    role_permissions,
    roles,
    sexos,
    tipos_cita,
    tipos_sangre,
    users,
    user_roles,
)

api_router = APIRouter()
api_router.include_router(roles.router)
api_router.include_router(permisos.router)
api_router.include_router(estados_cita.router)
api_router.include_router(tipos_cita.router)
api_router.include_router(sexos.router)
api_router.include_router(tipos_sangre.router)
api_router.include_router(users.router)
api_router.include_router(patients.router)
api_router.include_router(professionals.router)
api_router.include_router(emergency_contacts.router)
api_router.include_router(auth.router)
api_router.include_router(user_roles.router)
api_router.include_router(role_permissions.router)
