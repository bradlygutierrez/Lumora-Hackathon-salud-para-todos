from pathlib import Path
from secrets import token_urlsafe


class ProfileImageStorage:
    async def save(self, content: bytes, extension: str) -> str:
        raise NotImplementedError

    async def delete(self, url: str | None) -> None:
        raise NotImplementedError


class LocalProfileImageStorage(ProfileImageStorage):
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
