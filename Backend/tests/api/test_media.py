"""I04 -- GET /media/profile-images/{filename}.

Este router solo se monta cuando PROFILE_IMAGE_STORAGE_PROVIDER no es
"local" (ver main.py), así que se prueba con una app FastAPI aislada que
monta únicamente media.router -- no la app completa de tests/conftest.py,
que corre con provider="local" y por lo tanto no lo monta.
"""

import pytest
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from httpx import ASGITransport, AsyncClient

from lumora_api.api import media
from lumora_api.core.exceptions import DomainError, ResourceNotFoundError


class FakeReadStorage:
    def __init__(self, files: dict[str, tuple[bytes, str]]) -> None:
        self.files = files

    async def read(self, filename: str) -> tuple[bytes, str] | None:
        return self.files.get(filename)


def _client(storage, monkeypatch) -> AsyncClient:
    monkeypatch.setattr(media, "get_profile_image_storage", lambda: storage)

    app = FastAPI()
    app.include_router(media.router)

    @app.exception_handler(DomainError)
    async def domain_error_handler(_, error: DomainError) -> JSONResponse:
        return JSONResponse(
            status_code=error.status_code,
            content={"error": {"code": error.code, "message": error.message}},
        )

    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


@pytest.mark.asyncio
async def test_get_profile_image_returns_the_stored_bytes_and_content_type(monkeypatch):
    storage = FakeReadStorage({"abc123.png": (b"contenido-imagen", "image/png")})

    async with _client(storage, monkeypatch) as client:
        response = await client.get("/media/profile-images/abc123.png")

    assert response.status_code == 200
    assert response.content == b"contenido-imagen"
    assert response.headers["content-type"] == "image/png"
    assert response.headers["cache-control"] == "public, max-age=86400"


@pytest.mark.asyncio
async def test_get_profile_image_returns_404_when_the_object_does_not_exist(monkeypatch):
    storage = FakeReadStorage({})

    async with _client(storage, monkeypatch) as client:
        response = await client.get("/media/profile-images/no-existe.png")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_profile_image_rejects_dot_dot_filename_without_touching_storage(monkeypatch):
    """El nombre siempre es un solo segmento generado por
    ProfileImageStorage.save() -- un ".." no es algo que este endpoint
    haya podido servir alguna vez, y no debe llegar a storage.read()."""

    class ExplodingStorage:
        async def read(self, filename: str):
            raise AssertionError("no debería llamarse con un filename inválido")

    monkeypatch.setattr(media, "get_profile_image_storage", lambda: ExplodingStorage())

    with pytest.raises(ResourceNotFoundError):
        await media.get_profile_image("..")
