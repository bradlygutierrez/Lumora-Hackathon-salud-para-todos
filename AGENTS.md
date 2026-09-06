# Lumora Repository Guide

Lumora is a healthcare monorepo with a FastAPI API and three clients. Keep changes scoped to the component requested and preserve unrelated working-tree changes.

## Component Instructions

Read the nearest `AGENTS.md` before editing:

- `Backend/AGENTS.md` for the FastAPI backend.
- `Frontend/AGENTS.md` for all frontend work.
- `Frontend/lumora/AGENTS.md` for the patient/caregiver Expo app.
- `Frontend/lumora-health-staff/AGENTS.md` for the clinical staff Expo app.

More specific files override this guide.

## Repository Map

- `Backend/`: Python 3.14, FastAPI, SQLAlchemy, Alembic, PostgreSQL/Neon.
- `Frontend/lumora/`: Expo app for patients and caregivers.
- `Frontend/lumora-health-staff/`: Expo app for healthcare staff.
- `Frontend/lumora-website/lumora-website/`: Vite institutional portal.
- `.github/workflows/`: backend and Health Staff CI.

## Common Commands

Run commands from the component directory.

### Backend

```powershell
uv sync --frozen
uv run alembic upgrade head
uv run pytest -q
uv run fastapi dev
```

### Patient/Caregiver App

```powershell
npm ci
npm run lint
npm run typecheck
npm test -- --runInBand
npm start
```

### Health Staff App

```powershell
npm ci
npm run lint
npm run typecheck
npm test -- --runInBand
npm run e2e:web:smoke
npm start
```

### Institutional Portal

```powershell
npm ci
npm test
npm run build
npm run dev
```

## Working Rules

- Treat FastAPI routes and Pydantic schemas as the source of truth for frontend contracts; do not invent endpoints, fields, enums, roles, or permissions.
- Keep backend dependencies flowing through routers, services, repositories, and the database layer.
- Keep frontend networking centralized and feature-oriented; separate server state from local UI state.
- Treat patient and clinical data as sensitive. Never log secrets, tokens, credentials, or real patient data, and use synthetic data in tests.
- Preserve authorization and patient scoping. Hiding a frontend control is not a security boundary.
- Reuse existing patterns and dependencies. Add the smallest correct change and focused tests for meaningful behavior.
- Keep secrets out of Git. Copy `.env.example` to `.env` locally and configure the documented variables there.
- Use Conventional Commits on focused branches targeting `develop`.

## Before Handoff

Run the narrowest relevant tests first, then the component's lint, typecheck, test, and build/export checks in proportion to the change. Report commands run, failures, permissions affected, and any backend/frontend contract mismatch.
