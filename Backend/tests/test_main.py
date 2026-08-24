from collections import Counter

import pytest

from lumora_api.main import app


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