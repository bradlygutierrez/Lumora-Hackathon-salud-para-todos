FROM python:3.14-slim

WORKDIR /app

# Instalar uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copiar archivos de dependencias primero
COPY pyproject.toml uv.lock ./

# Instalar dependencias sin intentar instalar todavía nuestro proyecto
RUN uv sync --frozen --no-dev --no-install-project

# Copiar aplicación
COPY src ./src
COPY migrations ./migrations
COPY alembic.ini ./
COPY README.md ./

# Ahora sí instalar el proyecto
RUN uv sync --frozen --no-dev

EXPOSE 8000

CMD ["uv", "run", "fastapi", "run", "--host", "0.0.0.0", "--port", "8000"]