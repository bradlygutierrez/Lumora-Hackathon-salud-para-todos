from collections import Counter

import pytest

from lumora_api.main import app, global_exception_handler


def test_openapi_declares_every_used_tag_and_unique_operation_ids():
    spec = app.openapi()
    declared = {tag["name"] for tag in spec["tags"]}
    operations = [
        operation
        for path in spec["paths"].values()
        for operation in path.values()
        if isinstance(operation, dict)
    ]
    used = {tag for operation in operations for tag in operation.get("tags", [])}
    operation_ids = [operation["operationId"] for operation in operations]

    assert used <= declared
    assert all(count == 1 for count in Counter(operation_ids).values())


@pytest.mark.asyncio
async def test_cors_allows_configured_react_native_origin(client):
    response = await client.options(
        "/api/v1/auth/token",
        headers={
            "Origin": "http://localhost:8081",
            "Access-Control-Request-Method": "POST",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:8081"


@pytest.mark.asyncio
async def test_unexpected_errors_are_500_without_internal_details():
    response = await global_exception_handler(None, RuntimeError("database password leaked"))
    assert response.status_code == 500
    assert b"database password leaked" not in response.body


def test_openapi_describes_b08_auth_contract_without_session_secrets():
    spec = app.openapi()
    required = {
        "/api/v1/auth/register",
        "/api/v1/auth/verify-email",
        "/api/v1/auth/resend-verification",
        "/api/v1/auth/login",
        "/api/v1/auth/change-password",
        "/api/v1/auth/sessions",
        "/api/v1/auth/sessions/{session_id}",
        "/api/v1/auth/logout-others",
        "/api/v1/auth/refresh",
    }
    assert required <= set(spec["paths"])
    serialized = str(spec["components"]["schemas"]["SessionRead"])
    assert "refresh_token_hash" not in serialized
    assert "is_current" in serialized
