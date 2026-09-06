"""I04 -- contrato del storage durable de imágenes de perfil.

Cubre: el adaptador S3-compatible (contra un cliente fake, sin red), la
selección local/r2/b2 de get_profile_image_storage(), y la validación de
configuración que exige las 5 variables R2_*/B2_* correspondientes cuando
el provider es "r2"/"b2".
"""

import pytest

from lumora_api.core.config import Settings
from lumora_api.core import config as config_module
from lumora_api.services.profile_image_storage import (
    LocalProfileImageStorage,
    S3CompatibleProfileImageStorage,
    get_profile_image_storage,
)


class _FakeBody:
    """Sustituye al StreamingBody que boto3 devuelve en get_object."""

    def __init__(self, content: bytes) -> None:
        self._content = content

    def read(self) -> bytes:
        return self._content


class FakeS3Client:
    """Sustituye al cliente boto3 real -- sin red, sin credenciales reales.
    Solo registra las llamadas para poder verificarlas."""

    def __init__(self) -> None:
        self.objects: dict[str, bytes] = {}
        self.content_types: dict[str, str] = {}
        self.put_calls: list[dict] = []
        self.delete_calls: list[str] = []
        self.get_calls: list[str] = []

    def put_object(self, Bucket, Key, Body, ContentType):
        assert Bucket == "lumora-profile-images"
        self.objects[Key] = Body
        self.content_types[Key] = ContentType
        self.put_calls.append({"Key": Key, "Body": Body, "ContentType": ContentType})

    def delete_object(self, Bucket, Key):
        assert Bucket == "lumora-profile-images"
        self.delete_calls.append(Key)
        self.objects.pop(Key, None)
        self.content_types.pop(Key, None)

    def get_object(self, Bucket, Key):
        from botocore.exceptions import ClientError

        assert Bucket == "lumora-profile-images"
        self.get_calls.append(Key)
        if Key not in self.objects:
            raise ClientError({"Error": {"Code": "NoSuchKey"}}, "GetObject")
        return {
            "Body": _FakeBody(self.objects[Key]),
            "ContentType": self.content_types[Key],
        }


def _storage(client: FakeS3Client) -> S3CompatibleProfileImageStorage:
    return S3CompatibleProfileImageStorage(
        client=client,
        bucket="lumora-profile-images",
        public_base_url="https://images.lumora.example",
    )


@pytest.mark.asyncio
async def test_save_uploads_with_unique_name_ignoring_no_original_filename_and_sets_content_type():
    client = FakeS3Client()
    storage = _storage(client)

    url_one = await storage.save(b"contenido-uno", "jpg")
    url_two = await storage.save(b"contenido-dos", "jpg")

    assert url_one != url_two
    assert url_one.startswith("https://images.lumora.example/")
    assert url_one.endswith(".jpg")
    key = url_one.rsplit("/", 1)[-1]
    assert client.objects[key] == b"contenido-uno"
    assert client.put_calls[0]["ContentType"] == "image/jpeg"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("extension", "content_type"),
    [("jpg", "image/jpeg"), ("png", "image/png"), ("webp", "image/webp")],
)
async def test_save_sets_correct_content_type_per_extension(extension, content_type):
    client = FakeS3Client()
    storage = _storage(client)

    await storage.save(b"data", extension)

    assert client.put_calls[0]["ContentType"] == content_type


@pytest.mark.asyncio
async def test_delete_removes_the_object_referenced_by_the_url():
    client = FakeS3Client()
    storage = _storage(client)
    url = await storage.save(b"contenido", "png")

    await storage.delete(url)

    assert client.delete_calls == [url.rsplit("/", 1)[-1]]
    assert client.objects == {}


@pytest.mark.asyncio
async def test_delete_ignores_none_and_urls_from_a_different_base():
    client = FakeS3Client()
    storage = _storage(client)

    await storage.delete(None)
    await storage.delete("https://otro-storage.example/foo.png")

    assert client.delete_calls == []


@pytest.mark.asyncio
async def test_delete_ignores_urls_with_a_path_traversal_style_key():
    """La key siempre es un solo segmento generado por save() -- una URL
    con "/" despues del base_url no es algo que este adaptador haya
    escrito, y no debe traducirse en un delete_object con una key rara."""
    client = FakeS3Client()
    storage = _storage(client)

    await storage.delete("https://images.lumora.example/../secrets.env")

    assert client.delete_calls == []


@pytest.mark.asyncio
async def test_local_read_returns_the_saved_content_and_content_type(tmp_path):
    storage = LocalProfileImageStorage(str(tmp_path), "https://api.lumora.example/media/profile-images")
    url = await storage.save(b"contenido-local", "jpg")
    filename = url.rsplit("/", 1)[-1]

    result = await storage.read(filename)

    assert result == (b"contenido-local", "image/jpeg")


@pytest.mark.asyncio
async def test_local_read_returns_none_when_the_file_does_not_exist(tmp_path):
    storage = LocalProfileImageStorage(str(tmp_path), "https://api.lumora.example/media/profile-images")

    assert await storage.read("no-existe.png") is None


@pytest.mark.asyncio
async def test_read_returns_the_uploaded_content_and_content_type():
    client = FakeS3Client()
    storage = _storage(client)
    url = await storage.save(b"contenido-imagen", "webp")
    key = url.rsplit("/", 1)[-1]

    result = await storage.read(key)

    assert result == (b"contenido-imagen", "image/webp")


@pytest.mark.asyncio
async def test_read_returns_none_when_the_object_does_not_exist():
    client = FakeS3Client()
    storage = _storage(client)

    result = await storage.read("no-existe.png")

    assert result is None


@pytest.mark.asyncio
async def test_read_ignores_path_traversal_style_and_empty_filenames():
    client = FakeS3Client()
    storage = _storage(client)

    assert await storage.read("") is None
    assert await storage.read("..") is None
    assert await storage.read("../secrets.env") is None
    assert client.get_calls == []


@pytest.fixture(autouse=True)
def _reset_storage_cache():
    """get_profile_image_storage() y get_settings() están cacheados con
    lru_cache (por diseño, para no reconstruir el cliente en cada
    request) -- hay que limpiar el cache antes y después de cada test que
    lo ejercite, si no un test contamina al siguiente."""
    get_profile_image_storage.cache_clear()
    config_module.get_settings.cache_clear()
    yield
    get_profile_image_storage.cache_clear()
    config_module.get_settings.cache_clear()


def test_get_profile_image_storage_returns_local_adapter_by_default(monkeypatch):
    settings = Settings(
        database_url="sqlite+aiosqlite:///:memory:",
        environment="test",
        profile_image_storage_provider="local",
    )
    monkeypatch.setattr(config_module, "get_settings", lambda: settings)

    storage = get_profile_image_storage()

    assert isinstance(storage, LocalProfileImageStorage)


def test_get_profile_image_storage_returns_r2_adapter_when_configured(monkeypatch):
    settings = Settings(
        database_url="sqlite+aiosqlite:///:memory:",
        environment="test",
        profile_image_storage_provider="r2",
        r2_account_id="acc123",
        r2_access_key_id="key123",
        r2_secret_access_key="secret123",
        r2_bucket_name="lumora-profile-images",
        r2_public_base_url="https://images.lumora.example",
    )
    monkeypatch.setattr(config_module, "get_settings", lambda: settings)

    storage = get_profile_image_storage()

    assert isinstance(storage, S3CompatibleProfileImageStorage)
    assert storage.bucket == "lumora-profile-images"
    assert storage.public_base_url == "https://images.lumora.example"


@pytest.mark.parametrize(
    "overrides",
    [
        {},
        {"r2_account_id": "acc123"},
        {"r2_account_id": "acc123", "r2_access_key_id": "key123"},
        {
            "r2_account_id": "acc123",
            "r2_access_key_id": "key123",
            "r2_secret_access_key": "secret123",
        },
        {
            "r2_account_id": "acc123",
            "r2_access_key_id": "key123",
            "r2_secret_access_key": "secret123",
            "r2_bucket_name": "bucket",
        },
    ],
)
def test_r2_provider_requires_all_five_r2_settings(overrides):
    with pytest.raises(ValueError, match="PROFILE_IMAGE_STORAGE_PROVIDER=r2 requiere"):
        Settings(
            database_url="sqlite+aiosqlite:///:memory:",
            environment="test",
            profile_image_storage_provider="r2",
            **overrides,
        )


def test_get_profile_image_storage_returns_b2_adapter_when_configured(monkeypatch):
    settings = Settings(
        database_url="sqlite+aiosqlite:///:memory:",
        environment="test",
        profile_image_storage_provider="b2",
        b2_key_id="keyid123",
        b2_application_key="appkey123",
        b2_bucket_name="lumora-profile-images",
        b2_region="us-west-004",
        b2_public_base_url="https://images.lumora.example",
    )
    monkeypatch.setattr(config_module, "get_settings", lambda: settings)

    storage = get_profile_image_storage()

    assert isinstance(storage, S3CompatibleProfileImageStorage)
    assert storage.bucket == "lumora-profile-images"
    assert storage.public_base_url == "https://images.lumora.example"


@pytest.mark.parametrize(
    "overrides",
    [
        {},
        {"b2_key_id": "keyid123"},
        {"b2_key_id": "keyid123", "b2_application_key": "appkey123"},
        {
            "b2_key_id": "keyid123",
            "b2_application_key": "appkey123",
            "b2_bucket_name": "bucket",
        },
        {
            "b2_key_id": "keyid123",
            "b2_application_key": "appkey123",
            "b2_bucket_name": "bucket",
            "b2_region": "us-west-004",
        },
    ],
)
def test_b2_provider_requires_all_five_b2_settings(overrides):
    with pytest.raises(ValueError, match="PROFILE_IMAGE_STORAGE_PROVIDER=b2 requiere"):
        Settings(
            database_url="sqlite+aiosqlite:///:memory:",
            environment="test",
            profile_image_storage_provider="b2",
            **overrides,
        )
