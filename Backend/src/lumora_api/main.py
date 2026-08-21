from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from lumora_api.api.v1.router import api_router
from lumora_api.core.config import get_settings
from lumora_api.core.exceptions import DomainError

settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="API de organización de salud de Lumora",
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
