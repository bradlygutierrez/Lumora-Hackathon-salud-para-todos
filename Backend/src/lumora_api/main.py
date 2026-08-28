from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from urllib.parse import urlencode
from html import escape

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
    {"name": "Expedientes", "description": "Expedientes y antecedentes clínicos."},
    {"name": "Clínica de pacientes", "description": "Alergias y discapacidades."},
    {"name": "Consultas médicas", "description": "Consultas, signos vitales y notas clínicas."},
    {"name": "Diagnósticos", "description": "Diagnósticos asociados a consultas."},
    {"name": "Condiciones médicas", "description": "Condiciones e historial clínico."},
    {"name": "Integración clínica", "description": "Resumen, timeline y búsqueda clínica."},
    {"name": "Recetas y medicamentos", "description": "Medicamentos, recetas y detalles."},
    {"name": "Horarios y dosis", "description": "Horarios de medicación y registro de dosis."},
    {"name": "Indicadores y alertas", "description": "Indicadores, rangos, mediciones y alertas."},
    {"name": "Recordatorios y notificaciones", "description": "Recordatorios, notificaciones y preferencias."},
    {"name": "Cargos de salud", "description": "Catálogo de cargos sanitarios."},
    {"name": "Especialidades", "description": "Catálogo de especialidades médicas."},
    {"name": "Estados de expediente", "description": "Catálogo de estados de expediente."},
    {"name": "Estados de condicion", "description": "Catálogo de estados de condición."},
    {"name": "Tipos de antecedente", "description": "Catálogo de antecedentes médicos."},
    {"name": "Tipos de diagnostico", "description": "Catálogo de tipos de diagnóstico."},
    {"name": "Motivos de consulta", "description": "Catálogo de motivos de consulta."},
    {"name": "Estados de dosis", "description": "Catálogo de estados de dosis."},
    {"name": "Estados de receta", "description": "Catálogo de estados de receta."},
    {"name": "Vías de administración", "description": "Catálogo de vías de administración."},
    {"name": "Unidades de medida", "description": "Catálogo de unidades de medida."},
    {"name": "Orígenes de registro", "description": "Catálogo de orígenes de registro."},
    {"name": "Niveles de severidad", "description": "Catálogo de severidad clínica."},
    {"name": "Tipos de alerta", "description": "Catálogo de tipos de alerta."},
    {"name": "Tipos de recordatorio", "description": "Catálogo de recordatorios."},
    {"name": "Tipos de relación", "description": "Catálogo de relaciones entre pacientes."},
    {"name": "Cuidadores", "description": "Contextos autorizados."},
    {"name": "Salud del paciente", "description": "Resumen de salud para pacientes y cuidadores."},
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


@app.exception_handler(Exception)
async def global_exception_handler(_: Request, error: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "internal_error",
                "message": "Ocurrió un error interno"
            }
        },
    )


@app.get("/", tags=["Health"], summary="Comprobar estado de la API")
async def root() -> dict[str, str]:
    return {"message": "Lumora API"}


@app.get("/reset-password", include_in_schema=False, response_class=HTMLResponse)
async def reset_password_bridge(token: str) -> HTMLResponse:
    app_url = f"{settings.password_reset_deep_link}?{urlencode(dict(token=token))}"
    safe_url = escape(app_url, quote=True)
    html = f"""<!doctype html><html><head><meta name=\"robots\" content=\"noindex,nofollow\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Restablecer contraseña</title></head>
<body><main><h1>Restablecer contraseña</h1><p>Abriendo Lumora…</p><p><a href=\"{safe_url}\">Abrir Lumora</a></p><p>Necesitas tener Lumora instalado en este dispositivo para continuar.</p></main>
<script>window.location.replace({safe_url!r});</script></body></html>"""
    return HTMLResponse(html, headers={"Cache-Control": "no-store, no-cache, must-revalidate", "Pragma": "no-cache"})
