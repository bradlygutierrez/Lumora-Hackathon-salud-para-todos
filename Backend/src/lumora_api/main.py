from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.exc import TimeoutError as PoolTimeoutError
from urllib.parse import urlencode
from html import escape

from lumora_api.api.dependencies import SessionDep
from lumora_api.api.v1.router import api_router
from lumora_api.api.media import router as media_router
from lumora_api.api.middleware import RequestContextMiddleware, get_request_id
from lumora_api.core.config import get_settings
from lumora_api.core.exceptions import DomainError
from lumora_api.core.logging import configure_logging, logger

settings = get_settings()
configure_logging()
OPENAPI_TAGS = [
    {"name": "Health", "description": "Estado del servicio."},
    {"name": "Autenticación", "description": "Login, sesiones y recuperación de cuenta."},
    {"name": "Autenticación MFA", "description": "Segundo factor y recuperación."},
    {"name": "Usuarios", "description": "Usuarios y perfiles de acceso."},
    {"name": "Cuenta", "description": "Perfil propio de la cuenta autenticada."},
    {"name": "Pacientes", "description": "Perfiles clínicos de pacientes."},
    {"name": "Clientes API", "description": "Identificación y claves de aplicaciones que consumen la API."},
    {"name": "Profesionales de salud", "description": "Profesionales y licencias."},
    {"name": "Espacio profesional", "description": "Agenda, disponibilidad y pacientes vinculados del profesional autenticado."},
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
    {"name": "Expediente documental", "description": "Documento clínico canónico y exportación PDF."},
    {"name": "Clínica de pacientes", "description": "Alergias y discapacidades."},
    {"name": "Consultas médicas", "description": "Consultas, signos vitales y notas clínicas."},
    {"name": "Diagnósticos", "description": "Diagnósticos asociados a consultas."},
    {"name": "Condiciones médicas", "description": "Condiciones e historial clínico."},
    {"name": "Integración clínica", "description": "Resumen, timeline y búsqueda clínica."},
    {"name": "Expediente médico", "description": "Documento clínico exportable y su PDF (A15/B15)."},
    {"name": "Recetas y medicamentos", "description": "Medicamentos, recetas y detalles."},
    {"name": "Horarios y dosis", "description": "Horarios de medicación y registro de dosis."},
    {"name": "Indicadores y alertas", "description": "Indicadores, rangos, mediciones y alertas."},
    {"name": "Recordatorios y notificaciones", "description": "Recordatorios, notificaciones y preferencias."},
    {"name": "Alertas de salud", "description": "Vista unificada de alertas clinicas, dosis omitidas y citas proximas para el paciente."},
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
    {"name": "Media", "description": "Servir archivos almacenados (imágenes de perfil) cuando el bucket del proveedor es privado."},
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
# Outermost: agrega/propaga el request ID antes que cualquier otra
# capa, y ve la respuesta final (incluyendo headers de CORS) para el
# log de cierre de la petición.
app.add_middleware(RequestContextMiddleware)
# I04 -- en modo "local" (desarrollo) las imágenes se sirven desde el
# filesystem propio via StaticFiles. En modo r2/b2, si el bucket del
# proveedor es público (r2_public_base_url/b2_public_base_url apunta
# directo al proveedor) tampoco hace falta nada acá -- el navegador pide
# la imagen directo al proveedor. Pero si el bucket es privado (ej.
# Backblaze B2 sin tarjeta -- ver media.py), *_public_base_url apunta a
# este mismo backend, y es media_router quien descarga el objeto con
# credenciales privadas y lo sirve. Se monta siempre que el provider no
# sea "local" -- no hace daño si el bucket resulta ser público, ese
# router simplemente no se usaría en ese caso.
if settings.profile_image_storage_provider == "local":
    app.mount(
        settings.profile_image_base_url,
        StaticFiles(directory=settings.profile_image_dir, check_dir=False),
        name="profile-images",
    )
else:
    app.include_router(media_router)
app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.exception_handler(DomainError)
async def domain_error_handler(_: Request, error: DomainError) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code,
        content={"error": {"code": error.code, "message": error.message}},
    )


# I06 -- el pool de conexiones tiene un limite explicito (ver
# core/config.py). Si se agota (todas las conexiones del pool_size +
# max_overflow ocupadas) SQLAlchemy espera como maximo db_pool_timeout_seconds
# y despues lanza sqlalchemy.exc.TimeoutError -- nunca se queda esperando
# indefinidamente. Sin este handler, ese error caeria en el generico de
# abajo (500 "error interno"); aca se distingue con su propio log y un 503
# (el cliente puede reintentar) en vez de un 500 generico.
@app.exception_handler(PoolTimeoutError)
async def pool_timeout_handler(request: Request, error: PoolTimeoutError) -> JSONResponse:
    logger.error(
        "database pool exhausted",
        exc_info=error,
        extra={"request_id": get_request_id(request)},
    )
    return JSONResponse(
        status_code=503,
        content={
            "error": {
                "code": "database_unavailable",
                "message": "El servicio está saturado en este momento, intentá de nuevo en unos segundos",
            }
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request | None, error: Exception) -> JSONResponse:
    logger.error(
        "unhandled exception",
        exc_info=error,
        extra={"request_id": get_request_id(request) if request is not None else None},
    )
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


@app.get(
    "/healthz",
    tags=["Health"],
    summary="Readiness check para el balanceador de carga",
    include_in_schema=False,
)
async def healthz(session: SessionDep) -> JSONResponse:
    # Liviano a propósito: solo confirma que esta réplica puede hablar con
    # PostgreSQL/Neon (compartido entre réplicas). Sin autenticación -- el
    # balanceador/health check del hosting no manda credenciales.
    try:
        await session.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse(status_code=503, content={"status": "unavailable"})
    return JSONResponse(status_code=200, content={"status": "ok"})


@app.get("/reset-password", include_in_schema=False, response_class=HTMLResponse)
async def reset_password_bridge(token: str) -> HTMLResponse:
    app_url = f"{settings.password_reset_deep_link}?{urlencode(dict(token=token))}"
    safe_url = escape(app_url, quote=True)
    html = f"""<!doctype html><html><head><meta name=\"robots\" content=\"noindex,nofollow\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Restablecer contraseña</title></head>
<body><main><h1>Restablecer contraseña</h1><p>Abriendo Lumora…</p><p><a href=\"{safe_url}\">Abrir Lumora</a></p><p>Necesitas tener Lumora instalado en este dispositivo para continuar.</p></main>
<script>window.location.replace({safe_url!r});</script></body></html>"""
    return HTMLResponse(html, headers={"Cache-Control": "no-store, no-cache, must-revalidate", "Pragma": "no-cache"})
