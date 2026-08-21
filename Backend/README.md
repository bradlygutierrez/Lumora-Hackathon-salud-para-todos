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
