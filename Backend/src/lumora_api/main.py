from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from lumora_api.api.v1.router import api_router
from lumora_api.core.config import get_settings
from lumora_api.core.exceptions import DomainError

settings = get_settings()
OPENAPI_TAGS = [
    {"name": "Health", "description": "Estado del servicio."},
    {"name": "Autenticación", "description": "Login, sesiones y recuperación de cuenta."},
    {"name": "Autenticación MFA", "description": "Segundo factor y recuperación."},
    {"name": "Usuarios", "description": "Usuarios y perfiles de acceso."},
    {"name": "Pacientes", "description": "Perfiles clínicos de pacientes."},
    {"name": "Profesionales de salud", "description": "Profesionales y licencias."},
    {"name": "Citas", "description": "Agenda clínica."},
    {"name": "Contactos de emergencia", "description": "Contactos de pacientes."},
    {"name": "Roles", "description": "Catálogo de roles."},
    {"name": "Permisos", "description": "Catálogo de permisos."},
    {"name": "Roles de usuario", "description": "Asignación de roles."},
    {"name": "Permisos de rol", "description": "Asignación de permisos."},
    {"name": "Estados de cita", "description": "Catálogo de estados."},
    {"name": "Tipos de cita", "description": "Catálogo de modalidades."},
    {"name": "Sexos", "description": "Catálogo de sexo."},
    {"name": "Tipos de sangre", "description": "Catálogo sanguíneo."},
]
app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="API de organización de salud de Lumora",
    openapi_tags=OPENAPI_TAGS,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.exception_handler(DomainError)
async def domain_error_handler(_: Request, error: DomainError) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code,
        content={"error": {"code": error.code, "message": error.message}},
    )


@app.get("/", tags=["Health"], summary="Comprobar estado de la API")
async def root() -> dict[str, str]:
    return {"message": "Lumora API"}
