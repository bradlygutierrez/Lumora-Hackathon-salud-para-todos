import pytest
from sqlalchemy import select

from lumora_api.core.security import create_access_token
from lumora_api.models import Permiso, Rol, TokenRecuperacion, Usuario


async def make_user(client, session_factory, email, username):
    async with session_factory() as session:
        if await session.scalar(select(Rol).where(Rol.nombre == 'Paciente')) is None:
            session.add(Rol(nombre='Paciente'))
            await session.commit()
    response = await client.post('/api/v1/usuarios', json={
        'email': email, 'username': username, 'password': 'safe-password',
        'persona': {'nombres': 'Test', 'apellidos': 'Admin'},
    })
    return response.json()


@pytest.mark.asyncio
async def test_admin_can_create_admin_and_resend_password_reset(client, session_factory):
    manager = await make_user(client, session_factory, 'rbac@example.com', 'rbac-manager')
    async with session_factory() as session:
        user = await session.get(Usuario, manager['id'])
        session.add(Rol(nombre='Administrador'))
        role = Rol(nombre='RBAC manager')
        role.permisos = [Permiso(nombre='rbac:manage')]
        user.roles.append(role)
        session.add(role)
        await session.commit()
    manager_id = next(value for key, value in manager.items() if key == 'id')
    headers = {'Authorization': f'Bearer {create_access_token(manager_id)}'}
    created = await client.post('/api/v1/usuarios/admin', headers=headers, json={
        'email': 'new-admin@example.com', 'username': 'new-admin', 'password': 'safe-password',
        'persona': {'nombres': 'Nuevo', 'apellidos': 'Administrador'},
    })
    assert created.status_code == 201
    assert {role['nombre'] for role in created.json()['roles']} == {'Administrador'}
    created_id = next(value for key, value in created.json().items() if key == 'id')
    resent = await client.post(f'/api/v1/usuarios/{created_id}/password-reset', headers=headers)
    assert resent.status_code == 200
    async with session_factory() as session:
        assert await session.scalar(select(TokenRecuperacion).where(TokenRecuperacion.usuario_id == created_id)) is not None
