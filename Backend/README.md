# Lumora API

Backend FastAPI async para los flujos de salud de Lumora.

## Desarrollo

```powershell
Copy-Item .env.example .env
# Editar DATABASE_URL con la URL async de Neon
uv sync
uv run alembic upgrade head
uv run python -m lumora_api.db.seed
uv run fastapi dev
```

La API versionada está en `/api/v1` y Swagger en `/docs`.

## OAuth2 y autorización

Configure `JWT_SECRET` con al menos 32 caracteres. Obtenga un bearer token con
`POST /api/v1/auth/token` usando usuario/correo y contraseña. Los endpoints de
administración de roles y permisos requieren el permiso `rbac:manage`.

Los tokens de recuperación y verificación se generan para su entrega por el
servicio de correo, se guardan únicamente como hash y expiran después del plazo
configurado.

## MFA

1. Autenticarse y configurar TOTP con `POST /api/v1/auth/mfa/setup`.
2. Guardar los códigos de recuperación mostrados una sola vez.
3. Cuando `/auth/token` responda `mfa_required`, crear un desafío con
   `POST /api/v1/auth/mfa/challenge`.
4. Completarlo con `/auth/mfa/verify` o `/auth/mfa/recovery`.

Los desafíos duran cinco minutos, permiten cinco intentos y se consumen al
validarse. Los secretos TOTP se cifran con una clave derivada de `JWT_SECRET`;
rotar esa clave requiere volver a configurar MFA.
