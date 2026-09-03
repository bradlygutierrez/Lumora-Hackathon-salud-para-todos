from functools import lru_cache
from pathlib import Path
from secrets import token_urlsafe
from typing import Any


class ProfileImageStorage:
    async def save(self, content: bytes, extension: str) -> str:
        raise NotImplementedError

    async def delete(self, url: str | None) -> None:
        raise NotImplementedError

    async def read(self, filename: str) -> tuple[bytes, str] | None:
        """Devuelve (contenido, content_type) del objeto, o None si no
        existe. Usado por el endpoint proxy /media/profile-images/{filename}
        (ver api/v1/media.py) cuando el bucket del proveedor es privado --
        el backend descarga el objeto con sus propias credenciales y lo
        sirve, en vez de exponer una URL pública del bucket (I04, modo sin
        tarjeta con Backblaze B2)."""
        raise NotImplementedError


class LocalProfileImageStorage(ProfileImageStorage):
    """Adaptador de desarrollo -- guarda en el filesystem local.

    NO es durable en producción: cada réplica del backend tiene su propio
    disco, y el contenido se pierde en redeploys/restarts (ver I04). Se
    mantiene solo para correr el proyecto localmente sin credenciales de
    ningún proveedor externo.
    """

    def __init__(self, directory: str, base_url: str) -> None:
        self.directory = Path(directory)
        self.base_url = base_url.rstrip("/")

    async def save(self, content: bytes, extension: str) -> str:
        self.directory.mkdir(parents=True, exist_ok=True)
        filename = f"{token_urlsafe(24)}.{extension}"
        (self.directory / filename).write_bytes(content)
        return f"{self.base_url}/{filename}"

    async def delete(self, url: str | None) -> None:
        if not url or not url.startswith(self.base_url + "/"):
            return
        filename = Path(url.rsplit("/", 1)[-1]).name
        target = (self.directory / filename).resolve()
        if target.parent == self.directory.resolve() and target.exists():
            target.unlink()

    async def read(self, filename: str) -> tuple[bytes, str] | None:
        target = (self.directory / Path(filename).name).resolve()
        if target.parent != self.directory.resolve() or not target.exists():
            return None
        content_type = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
        }.get(target.suffix.lower(), "application/octet-stream")
        return target.read_bytes(), content_type


class S3CompatibleProfileImageStorage(ProfileImageStorage):
    """Adaptador durable de object storage (I04).

    Funciona contra cualquier proveedor que hable la API de S3 -- Cloudflare
    R2, AWS S3, Backblaze B2, etc. -- pasando el `endpoint_url` correcto al
    construir el cliente (ver `build_r2_client` más abajo para R2
    específicamente). Las credenciales y el bucket llegan SIEMPRE por
    variables de entorno/secret manager (ver core/config.py); esta clase
    nunca las trae hardcodeadas ni las escribe en el código.

    Las llamadas a boto3 son síncronas y bloqueantes -- se ejecutan en un
    hilo aparte con `asyncio.to_thread` para no bloquear el event loop, sin
    necesitar un cliente async dedicado (aioboto3/aiobotocore no siempre
    siguen el ritmo de versiones nuevas de Python).
    """

    def __init__(self, client: Any, bucket: str, public_base_url: str) -> None:
        self.client = client
        self.bucket = bucket
        self.public_base_url = public_base_url.rstrip("/")

    async def save(self, content: bytes, extension: str) -> str:
        import asyncio

        filename = f"{token_urlsafe(24)}.{extension}"
        content_type = {
            "jpg": "image/jpeg",
            "png": "image/png",
            "webp": "image/webp",
        }.get(extension, "application/octet-stream")

        def _put() -> None:
            self.client.put_object(
                Bucket=self.bucket,
                Key=filename,
                Body=content,
                ContentType=content_type,
            )

        await asyncio.to_thread(_put)
        return f"{self.public_base_url}/{filename}"

    async def delete(self, url: str | None) -> None:
        import asyncio

        if not url or not url.startswith(self.public_base_url + "/"):
            return
        key = url[len(self.public_base_url) + 1 :]
        # Nombres siempre son un solo segmento generado por save() (nunca
        # el nombre original del usuario) -- una "/" en la key indicaría
        # una URL ajena/manipulada, nunca algo que este adaptador escribió.
        if not key or "/" in key:
            return

        def _delete() -> None:
            self.client.delete_object(Bucket=self.bucket, Key=key)

        await asyncio.to_thread(_delete)

    async def read(self, filename: str) -> tuple[bytes, str] | None:
        """Descarga el objeto directamente del bucket usando las
        credenciales privadas del backend -- lo que permite mantener el
        bucket sin acceso público (ver módulo docstring y api/v1/media.py).
        """
        import asyncio

        from botocore.exceptions import ClientError

        if not filename or "/" in filename or filename in (".", ".."):
            return None

        def _get():
            try:
                return self.client.get_object(Bucket=self.bucket, Key=filename)
            except ClientError as exc:
                code = exc.response.get("Error", {}).get("Code", "")
                if code in ("NoSuchKey", "404"):
                    return None
                raise

        response = await asyncio.to_thread(_get)
        if response is None:
            return None
        body = await asyncio.to_thread(response["Body"].read)
        content_type = response.get("ContentType") or "application/octet-stream"
        return body, content_type


def build_r2_client(
    account_id: str,
    access_key_id: str,
    secret_access_key: str,
):
    """Crea un cliente boto3 apuntando al endpoint S3-compatible de
    Cloudflare R2 para esa cuenta. Import de boto3 diferido: así el import
    de este módulo no falla en desarrollo local si boto3 no está instalado
    (Local no lo necesita) y solo se paga el costo cuando de verdad se usa
    R2."""
    import boto3

    return boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=access_key_id,
        aws_secret_access_key=secret_access_key,
        region_name="auto",
    )


def build_b2_client(
    key_id: str,
    application_key: str,
    region: str,
):
    """Crea un cliente boto3 apuntando al endpoint S3-compatible de
    Backblaze B2 para esa región (ej. "us-west-004" -> endpoint
    https://s3.us-west-004.backblazeb2.com). En B2, `key_id` y
    `application_key` son el equivalente al access key id/secret access
    key de S3 (se generan en "App Keys" del bucket). Import de boto3
    diferido por la misma razón que build_r2_client."""
    import boto3

    return boto3.client(
        "s3",
        endpoint_url=f"https://s3.{region}.backblazeb2.com",
        aws_access_key_id=key_id,
        aws_secret_access_key=application_key,
        region_name=region,
    )


@lru_cache
def get_profile_image_storage() -> ProfileImageStorage:
    """Construye (una sola vez, cacheado) el adaptador que corresponde
    según PROFILE_IMAGE_STORAGE_PROVIDER -- Local para desarrollo, R2 o B2
    en producción (cualquier proveedor S3-compatible). Las validaciones de
    `core.config.Settings` (`validate_r2_storage_config` /
    `validate_b2_storage_config`) ya garantizan que las credenciales del
    provider elegido están presentes; acá no se revalida."""
    from lumora_api.core.config import get_settings

    settings = get_settings()
    if settings.profile_image_storage_provider == "r2":
        client = build_r2_client(
            account_id=settings.r2_account_id,
            access_key_id=settings.r2_access_key_id,
            secret_access_key=settings.r2_secret_access_key.get_secret_value(),
        )
        return S3CompatibleProfileImageStorage(
            client=client,
            bucket=settings.r2_bucket_name,
            public_base_url=settings.r2_public_base_url,
        )
    if settings.profile_image_storage_provider == "b2":
        client = build_b2_client(
            key_id=settings.b2_key_id,
            application_key=settings.b2_application_key.get_secret_value(),
            region=settings.b2_region,
        )
        return S3CompatibleProfileImageStorage(
            client=client,
            bucket=settings.b2_bucket_name,
            public_base_url=settings.b2_public_base_url,
        )
    return LocalProfileImageStorage(settings.profile_image_dir, settings.profile_image_base_url)
