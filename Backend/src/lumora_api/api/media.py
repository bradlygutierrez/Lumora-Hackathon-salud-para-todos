"""I04 -- proxy de imágenes de perfil cuando el bucket del proveedor
S3-compatible es privado.

Con R2/B2 en modo "URL pública", el navegador/app pide la imagen
directamente al proveedor (ver *_public_base_url en core/config.py) y
este endpoint ni se monta. Pero un bucket privado (ej. Backblaze B2 sin
tarjeta -- hacerlo público exige tener historial de pagos o pagar una
tarifa única, ver docs/B11_PROFILE_ACCOUNT_BACKEND_CONTRACT.md) no es
accesible desde fuera con una URL simple. Este router resuelve eso: el
backend descarga el objeto con sus propias credenciales (privadas, nunca
expuestas al cliente) y lo devuelve él mismo -- así nunca hace falta que
el bucket sea público. Solo se monta en main.py cuando el provider no es
"local" (para "local" ya sirve el mount de StaticFiles).
"""

from fastapi import APIRouter, Response

from lumora_api.core.exceptions import ResourceNotFoundError
from lumora_api.services.profile_image_storage import get_profile_image_storage

router = APIRouter(prefix="/media/profile-images", tags=["Media"])


@router.get("/{filename}", summary="Servir una imagen de perfil almacenada")
async def get_profile_image(filename: str) -> Response:
    # filename siempre es un solo segmento generado por
    # ProfileImageStorage.save() (token_urlsafe + extensión) -- nunca el
    # nombre original de un usuario. FastAPI ya no matchea esta ruta si
    # el path param trae "/", pero igual se valida por si acaso llega
    # algo como "..".
    if not filename or filename in (".", "..") or "/" in filename:
        raise ResourceNotFoundError("Imagen no encontrada")

    storage = get_profile_image_storage()
    result = await storage.read(filename)
    if result is None:
        raise ResourceNotFoundError("Imagen no encontrada")

    content, content_type = result
    return Response(
        content=content,
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=86400"},
    )
