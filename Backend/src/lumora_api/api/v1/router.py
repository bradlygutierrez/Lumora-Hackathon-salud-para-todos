from fastapi import APIRouter

from lumora_api.api.v1 import estados_cita, permisos, roles, sexos, tipos_cita, tipos_sangre

api_router = APIRouter()
api_router.include_router(roles.router)
api_router.include_router(permisos.router)
api_router.include_router(estados_cita.router)
api_router.include_router(tipos_cita.router)
api_router.include_router(sexos.router)
api_router.include_router(tipos_sangre.router)
