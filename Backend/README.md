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
