from types import SimpleNamespace

import pytest

import lumora_api.api.dependencies as deps_module
from lumora_api.api.dependencies import identify_api_client
from lumora_api.core.exceptions import AuthenticationError


class _FakeSecret:
    def __init__(self, value: str) -> None:
        self._value = value

    def get_secret_value(self) -> str:
        return self._value


def _settings_with_master_key(value: str):
    return SimpleNamespace(api_master_key=_FakeSecret(value))


@pytest.mark.asyncio
async def test_master_key_resolves_without_touching_the_database(session_factory, monkeypatch):
    monkeypatch.setattr(
        deps_module, "get_settings", lambda: _settings_with_master_key("fixed-master-value")
    )
    async with session_factory() as session:
        client = await identify_api_client(session, "fixed-master-value")

    assert client.client_id == "master"
    assert client.activo is True


@pytest.mark.asyncio
async def test_wrong_key_is_rejected_even_with_a_master_key_configured(
    session_factory, monkeypatch
):
    monkeypatch.setattr(
        deps_module, "get_settings", lambda: _settings_with_master_key("fixed-master-value")
    )
    async with session_factory() as session:
        with pytest.raises(AuthenticationError):
            await identify_api_client(session, "something-else")


@pytest.mark.asyncio
async def test_master_key_is_disabled_by_default(session_factory, monkeypatch):
    monkeypatch.setattr(deps_module, "get_settings", lambda: _settings_with_master_key(""))
    async with session_factory() as session:
        with pytest.raises(AuthenticationError):
            await identify_api_client(session, "anything-at-all")
