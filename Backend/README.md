# Lumora API

Backend FastAPI asíncrono para usuarios, pacientes, profesionales, autenticación, MFA y citas de Lumora.

## Requisitos

- Python 3.14
- [uv](https://docs.astral.sh/uv/)
- Una base PostgreSQL en Neon

No se necesita PostgreSQL local.

## Instalación desde cero

Desde la carpeta `Backend`:

```powershell
Copy-Item .env.example .env
uv sync
```

Edite `.env` y reemplace `DATABASE_URL`, `JWT_SECRET` y `CORS_ORIGINS`. Neon acepta una URL estándar:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require&channel_binding=require
```

La aplicación selecciona automáticamente el driver asíncrono. `JWT_SECRET` debe tener al menos 32 caracteres y nunca debe versionarse.

## Migraciones y catálogos

```powershell
uv run alembic upgrade head
uv run python -m lumora_api.db.seed
uv run alembic current
```

La revisión esperada es `20260824_05 (head)`. El seed es idempotente y carga roles, permisos, estados, tipos de cita, sexos y tipos de sangre.

## Ejecutar la API

```powershell
uv run fastapi dev
```

- API: `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/docs`
- OpenAPI: `http://127.0.0.1:8000/openapi.json`
- API versionada: `/api/v1`

## Autenticación

Use `POST /api/v1/auth/login` con `login` (username o correo) y `password`. La respuesta contiene un access JWT corto y un refresh token rotativo. Los refresh tokens se almacenan únicamente como hash y se revocan con `logout` o `logout-all`.

Si el usuario tiene MFA activo, complete `/api/v1/auth/mfa/challenge` y luego `/api/v1/auth/mfa/verify` o `/api/v1/auth/mfa/recovery`. El endpoint OAuth2 de Swagger permanece disponible en `POST /api/v1/auth/token`. La administración de roles y permisos requiere `rbac:manage`.

## Pruebas

La suite usa SQLite en memoria y no modifica Neon:

```powershell
uv run pytest -q
```

Antes del despliegue valide además una base Neon vacía con `alembic upgrade head`, ejecute el seed y revise `/docs`.

## Docker

```powershell
docker build -t lumora-api .
docker run --env-file .env -p 8000:8000 lumora-api
```
