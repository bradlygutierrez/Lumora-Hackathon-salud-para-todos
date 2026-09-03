import logging
from types import SimpleNamespace

import pytest

from lumora_api.api.middleware import REQUEST_ID_HEADER, get_request_id
from lumora_api.main import app, global_exception_handler


@pytest.mark.asyncio
async def test_request_id_is_generated_when_missing(client):
    response = await client.get("/")
    request_id = response.headers.get(REQUEST_ID_HEADER)
    assert request_id
    assert len(request_id) >= 8


@pytest.mark.asyncio
async def test_request_id_is_propagated_when_provided(client):
    response = await client.get("/", headers={REQUEST_ID_HEADER: "caller-supplied-id"})
    assert response.headers.get(REQUEST_ID_HEADER) == "caller-supplied-id"


@pytest.mark.asyncio
async def test_request_completion_is_logged_with_safe_context(client, caplog):
    with caplog.at_level(logging.INFO, logger="lumora_api"):
        response = await client.get(
            "/", headers={REQUEST_ID_HEADER: "log-context-check"}
        )

    record = next(r for r in caplog.records if r.message == "request completed")
    assert record.request_id == "log-context-check"
    assert record.method == "GET"
    assert record.path == "/"
    assert record.status_code == response.status_code
    assert isinstance(record.duration_ms, float)


@pytest.mark.asyncio
async def test_authorization_header_value_never_reaches_the_logs(client, caplog):
    secret = "Bearer super-secret-token-should-not-be-logged"
    with caplog.at_level(logging.INFO, logger="lumora_api"):
        await client.get("/", headers={"Authorization": secret})

    assert secret not in caplog.text
    assert "super-secret-token-should-not-be-logged" not in caplog.text


@pytest.mark.asyncio
async def test_error_responses_are_logged_at_warning_or_above(client, caplog):
    with caplog.at_level(logging.INFO, logger="lumora_api"):
        response = await client.get("/api/v1/clientes-api")

    assert response.status_code == 401
    record = next(r for r in caplog.records if r.message == "request completed")
    assert record.levelno >= logging.WARNING


def test_get_request_id_reads_state_safely():
    assert get_request_id(SimpleNamespace(state=SimpleNamespace(request_id="abc"))) == "abc"
    assert get_request_id(SimpleNamespace(state=SimpleNamespace())) is None


@pytest.mark.asyncio
async def test_unhandled_exception_is_logged_with_the_request_id_instead_of_printed(caplog):
    request = SimpleNamespace(state=SimpleNamespace(request_id="exc-request-id"))
    with caplog.at_level(logging.ERROR, logger="lumora_api"):
        response = await global_exception_handler(request, RuntimeError("database password leaked"))

    assert response.status_code == 500
    assert b"database password leaked" not in response.body

    record = next(r for r in caplog.records if r.message == "unhandled exception")
    assert record.request_id == "exc-request-id"
    assert record.exc_info is not None


@pytest.mark.asyncio
async def test_unhandled_exception_handler_tolerates_a_missing_request(caplog):
    with caplog.at_level(logging.ERROR, logger="lumora_api"):
        response = await global_exception_handler(None, RuntimeError("boom"))

    assert response.status_code == 500
    record = next(r for r in caplog.records if r.message == "unhandled exception")
    assert record.request_id is None
