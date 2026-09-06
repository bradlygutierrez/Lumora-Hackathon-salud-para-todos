import pytest


@pytest.mark.asyncio
async def test_reset_bridge_returns_no_store_html(client):
    response = await client.get("/reset-password?token=abc%2B%2F%3D%3F123")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store, no-cache, must-revalidate"
    body = response.text
    assert "noindex,nofollow" in body
    assert "Abrir Lumora" in body
    assert "Necesitas tener Lumora instalado" in body
    assert "lumora://reset-password?token=abc%2B%2F%3D%3F123" in body
    assert "abc+/=?123" not in body
