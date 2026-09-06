import pyotp
import pytest
from sqlalchemy import select

from lumora_api.core.security import hash_token
from lumora_api.models import CodigoRecuperacionMfa, MetodoMfa, Rol


async def register_and_setup(client, session_factory):
    async with session_factory() as session:
        session.add_all([Rol(nombre="Paciente"), MetodoMfa(nombre="totp")])
        await session.commit()
        method_id = await session.scalar(select(MetodoMfa.id))
    user = await client.post(
        "/api/v1/usuarios",
        json={
            "email": "ana@example.com",
            "username": "ana",
            "password": "safe-password",
            "persona": {"nombres": "Ana", "apellidos": "López"},
        },
    )
    login = await client.post(
        "/api/v1/auth/token",
        data={"username": "ana", "password": "safe-password"},
    )
    setup = await client.post(
        "/api/v1/auth/mfa/setup",
        json={"metodo_id": method_id},
        headers={"Authorization": f"Bearer {login.json()['access_token']}"},
    )
    confirmed = await client.post(
        "/api/v1/auth/mfa/setup/confirm",
        json={"method_id": setup.json()["method_id"], "code": pyotp.TOTP(setup.json()["secret"]).now()},
        headers={"Authorization": f"Bearer {login.json()['access_token']}"},
    )
    setup_data = {**setup.json(), **confirmed.json()}
    return user.json(), setup_data, login.json()["access_token"]


async def challenge(client):
    return await client.post(
        "/api/v1/auth/mfa/challenge",
        json={"username": "ana", "password": "safe-password"},
    )


@pytest.mark.asyncio
async def test_valid_totp_consumes_challenge_and_blocks_oauth_bypass(client, session_factory):
    _, setup, access_token = await register_and_setup(client, session_factory)
    methods = await client.get(
        "/api/v1/auth/mfa/methods",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert methods.json()[0]["activo"] is True

    bypass = await client.post(
        "/api/v1/auth/token",
        data={"username": "ana", "password": "safe-password"},
    )
    assert bypass.status_code == 403
    assert bypass.json()["error"]["code"] == "mfa_required"

    mobile_login = await client.post(
        "/api/v1/auth/login",
        json={"login": "ana", "password": "safe-password"},
    )
    assert mobile_login.status_code == 200
    assert mobile_login.json()["mfa_required"] is True
    assert "challenge_token" in mobile_login.json()
    assert "access_token" not in mobile_login.json()
    assert "refresh_token" not in mobile_login.json()

    pending = mobile_login
    raw_challenge = pending.json()["challenge_token"]
    verified = await client.post(
        "/api/v1/auth/mfa/verify",
        json={
            "challenge_token": raw_challenge,
            "code": pyotp.TOTP(setup["secret"]).now(),
        },
    )
    assert verified.status_code == 200
    assert "access_token" in verified.json()
    assert (
        await client.post(
            "/api/v1/auth/mfa/verify",
            json={"challenge_token": raw_challenge, "code": "000000"},
        )
    ).status_code == 400


@pytest.mark.asyncio
async def test_methods_lists_totp_for_user_without_mfa(client, session_factory):
    async with session_factory() as session:
        session.add_all([Rol(nombre="Paciente"), MetodoMfa(nombre="totp")])
        await session.commit()

    await client.post(
        "/api/v1/usuarios",
        json={
            "email": "available@example.com",
            "username": "available",
            "password": "safe-password",
            "persona": {"nombres": "Ana", "apellidos": "López"},
        },
    )
    login = await client.post(
        "/api/v1/auth/token",
        data={"username": "available", "password": "safe-password"},
    )

    response = await client.get(
        "/api/v1/auth/mfa/methods",
        headers={"Authorization": f"Bearer {login.json()['access_token']}"},
    )

    assert response.status_code == 200
    assert response.json() == [
        {"id": None, "metodo_id": 1, "nombre": "totp", "activo": False}
    ]


@pytest.mark.asyncio
async def test_recovery_code_is_hashed_and_cannot_be_reused(client, session_factory):
    _, setup, _ = await register_and_setup(client, session_factory)
    recovery_code = setup["recovery_codes"][0]
    async with session_factory() as session:
        stored = await session.scalar(
            select(CodigoRecuperacionMfa).where(
                CodigoRecuperacionMfa.codigo_hash == hash_token(recovery_code)
            )
        )
        assert stored.codigo_hash != recovery_code

    first = (await challenge(client)).json()["challenge_token"]
    recovered = await client.post(
        "/api/v1/auth/mfa/recovery",
        json={"challenge_token": first, "recovery_code": recovery_code},
    )
    assert recovered.status_code == 200

    second = (await challenge(client)).json()["challenge_token"]
    reused = await client.post(
        "/api/v1/auth/mfa/recovery",
        json={"challenge_token": second, "recovery_code": recovery_code},
    )
    assert reused.status_code == 400
    assert reused.json()["error"]["code"] == "invalid_mfa_code"


@pytest.mark.asyncio
async def test_mfa_method_can_be_disabled(client, session_factory):
    _, setup, access_token = await register_and_setup(client, session_factory)
    deleted = await client.delete(
        f"/api/v1/auth/mfa/{setup['method_id']}",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert deleted.status_code == 204
    login = await client.post(
        "/api/v1/auth/token",
        data={"username": "ana", "password": "safe-password"},
    )
    assert login.status_code == 200
