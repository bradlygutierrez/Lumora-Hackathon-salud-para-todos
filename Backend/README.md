# Lumora API

Backend FastAPI async para los flujos de salud de Lumora.

## Requisitos

- Python 3.14.
- [uv](https://docs.astral.sh/uv/).
- Una base PostgreSQL vacía en Neon.
- Docker, opcional.

## Inicio rápido

1. Instale las dependencias y cree la configuración local:

```powershell
uv sync
Copy-Item .env.example .env
```

2. Edite `.env`. Defina una `DATABASE_URL` de Neon con SSL y un `JWT_SECRET` aleatorio de al menos 32 caracteres:

```dotenv
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST/DATABASE?ssl=require
JWT_SECRET=replace-with-a-random-secret-of-at-least-32-characters
```

No confirme `.env`; Git solo versiona `.env.example`.

3. Aplique todas las migraciones y verifique que exista un solo head:

```powershell
uv run alembic heads
uv run alembic upgrade head
uv run alembic current
```

`alembic current` debe mostrar `da9b16284bf3 (head)`.

4. Cargue los catálogos y roles base. El comando es idempotente y puede repetirse:

```powershell
uv run python -m lumora_api.db.seed
```

El seed crea los roles `Paciente` y `Administrador`, carga los catálogos y asigna al Administrador los permisos disponibles.

5. Inicie la API:

```powershell
uv run fastapi dev
```

- API: `http://127.0.0.1:8000/api/v1`
- Swagger: `http://127.0.0.1:8000/docs`
- OpenAPI: `http://127.0.0.1:8000/openapi.json`

## Pruebas

La suite usa SQLite en memoria y no modifica Neon:

```powershell
uv run pytest
```

Para una entrega, registre también la evidencia de `alembic upgrade head` y del seed sobre una base Neon vacía.

## CORS

`CORS_ORIGINS` es una lista JSON de orígenes autorizados. Los valores predeterminados cubren React Native/Expo local:

```dotenv
CORS_ORIGINS=["http://localhost:8081","http://localhost:19006"]
```

Agregue los orígenes HTTPS de producción de forma explícita; no use `*` con credenciales.

## Docker

```powershell
docker build -t lumora-api .
docker run --rm --env-file .env lumora-api uv run alembic upgrade head
docker run --rm --env-file .env lumora-api uv run python -m lumora_api.db.seed
docker run --rm --env-file .env -p 8000:8000 lumora-api
```

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

## Catálogos clínicos

Los catálogos clínicos exponen CRUD con paginación (`limit`, `offset`) y filtro
opcional por estado (`activo`). `DELETE` desactiva el registro sin borrado físico
y `PATCH` permite reactivarlo enviando `{"activo": true}`.

- `/api/v1/cargos-salud`
- `/api/v1/especialidades`
- `/api/v1/estados-expediente`
- `/api/v1/estados-condicion`
- `/api/v1/tipos-antecedente`
- `/api/v1/tipos-diagnostico`

## Expediente clínico

Los endpoints clínicos requieren el permiso `clinica:manage`. Todos los recursos
usan borrado lógico y aceptan filtro opcional `activo` en listados.

- `POST /api/v1/expedientes`
- `GET /api/v1/expedientes`
- `GET /api/v1/expedientes/{id}`
- `PATCH /api/v1/expedientes/{id}`
- `DELETE /api/v1/expedientes/{id}`
- `CRUD /api/v1/expedientes/{id}/antecedentes`
- `CRUD /api/v1/pacientes/{id}/alergias`
- `CRUD /api/v1/pacientes/{id}/discapacidades`

## Consultas médicas

Las consultas médicas requieren `clinica:manage`, pertenecen a un expediente,
paciente y profesional, y permiten filtrar listados por expediente, paciente,
profesional, estado activo y rango de fecha.

- `POST /api/v1/consultas`
- `GET /api/v1/consultas`
- `GET /api/v1/consultas/{id}`
- `PATCH /api/v1/consultas/{id}`
- `DELETE /api/v1/consultas/{id}`
- `POST /api/v1/consultas/{id}/signos-vitales`
- `GET /api/v1/consultas/{id}/signos-vitales`
- `POST /api/v1/consultas/{id}/notas`
- `GET /api/v1/consultas/{id}/notas`
- `GET /api/v1/consultas/{id}/notas/{nota_id}`
- `PATCH /api/v1/consultas/{id}/notas/{nota_id}`
- `GET /api/v1/expedientes/{id}/consultas`

## Diagnósticos y condiciones

Los diagnósticos y condiciones médicas requieren `clinica:manage`. Las
condiciones registran historial automático al crearse, cambiar de estado o
borrarse lógicamente.

- `POST /api/v1/consultas/{id}/diagnosticos`
- `GET /api/v1/consultas/{id}/diagnosticos`
- `GET /api/v1/diagnosticos/{id}`
- `PATCH /api/v1/diagnosticos/{id}`
- `DELETE /api/v1/diagnosticos/{id}`
- `POST /api/v1/expedientes/{id}/condiciones`
- `GET /api/v1/expedientes/{id}/condiciones`
- `PATCH /api/v1/condiciones/{id}`
- `DELETE /api/v1/condiciones/{id}`
- `GET /api/v1/condiciones/{id}/historial`
