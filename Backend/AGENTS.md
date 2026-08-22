AGENTS.md

Purpose

These rules define how coding agents must structure and modify the Lumora backend. The goal is to keep the FastAPI codebase modular, easy to change, and easy to review as the project grows.

Application context

Lumora is a healthcare-oriented hackathon application designed to help users manage health-related workflows such as medicines, appointments, reminders, and related personal health organization.

Current technical context:

Backend: FastAPI with Python.

Frontend: React Native.

Database: PostgreSQL hosted on Neon.

Dependency and project management: uv, pyproject.toml, and uv.lock.

Containerization: Docker.

API style: versioned REST API using FastAPI APIRouter.

Backend organization: layered modular architecture using routers, services, repositories, schemas, ORM models, core utilities, and database infrastructure.

Tests: pytest, with the test tree mirroring the source tree.

Development workflow: changes are made through feature branches and Pull Requests, with CI checks required before merge when configured.

Agents must preserve this context when making implementation decisions. Do not introduce another framework, database, package manager, architectural style, or deployment strategy unless the task explicitly requires it or the existing project has already adopted it.

When implementation details are ambiguous, prefer solutions that are compatible with FastAPI, React Native clients, PostgreSQL/Neon, uv, Docker, and the current layered architecture.

1. Prefer feature-oriented changes

Organize work so that a requirement change affects as few directories as possible.

The reason to group by feature is churn: when a requirement changes, related edits should remain localized instead of being scattered across many unrelated folders.

A folder named only after a technical type tells you what a file is, but not why it changed. When creating or expanding modules, keep files related to the same feature or resource easy to locate together whenever the existing architecture allows it.

Agents must avoid unnecessary cross-project edits for a single feature.

2. Preserve layer boundaries

The expected dependency direction is:

API / Routers
    ↓
Services
    ↓
Repositories
    ↓
Database

Service rule

Modules inside app/services/ must never import from app/api/.

If a service needs information available in a route, that information must be passed to the service as an argument.

Bad:

# app/services/user_service.py
from app.api.v1.users import current_user

Good:

def update_user(user_id: int, data: UserUpdate):
    ...

The moment a service imports a router or API module, the architectural layers have merged even if the directory structure still suggests otherwise.

Agents must not introduce reverse dependencies between layers.

3. Keep ORM models and API schemas separate

app/models/ and app/schemas/ must remain separate.

app/models/ contains ORM/database models.

app/schemas/ contains Pydantic request and response models.

Do not merge them even when they initially contain identical fields.

They will diverge as soon as the database contains information that must not be exposed through the API, for example:

internal risk scores

soft-delete flags

audit fields

internal state

security-related metadata

Separating models from schemas makes API exposure an explicit decision instead of an accidental one.

Agents must not return ORM models directly when a response schema should be used.

4. Tests must mirror the source structure

The tests/ directory should mirror the structure of the application wherever practical.

Example:

app/
├── api/
│   └── v1/
│       └── users.py
├── services/
│   └── user_service.py
└── repositories/
    └── user_repository.py

tests/
├── api/
│   └── v1/
│       └── test_users.py
├── services/
│   └── test_user_service.py
└── repositories/
    └── test_user_repository.py

This is not cosmetic. Mirroring the source tree makes missing coverage visible.

A service module without a corresponding test module under tests/services/ should be immediately noticeable.

Agents that add or modify behavior must add or update the corresponding tests.

Mandatory test-per-task rule

Every implementation task that changes executable behavior must include its corresponding tests as part of the same task.

A task is not considered complete if the implementation exists but its required tests are missing.

This applies to, among others:

new endpoints

modified endpoints

services

business rules

repositories

database queries

authentication or authorization behavior

validation logic

exception handling

bug fixes

regressions

integrations

shared utilities with behavioral logic

For bug fixes, add a regression test that fails before the fix and passes after the fix whenever practical.

For a new source module, create the corresponding test module in the mirrored tests/ location when the module contains behavior worth testing.

Purely structural tasks with no executable behavior, such as creating an empty package, moving documentation, or adding an empty __init__.py, do not require artificial placeholder tests unless CI temporarily requires at least one collected test.

5. APIRouter is the unit of API modularity

Each resource should have its own FastAPI APIRouter.

Each router owns its:

prefix

tags

route-level dependencies

authentication requirements when applicable

rate-limiting dependencies when applicable

Example:

router = APIRouter(
    prefix="/users",
    tags=["users"],
    dependencies=[Depends(require_auth)],
)

Routers must be registered into the application at a single explicit integration point.

Example:

api_router.include_router(users.router)
api_router.include_router(appointments.router)
api_router.include_router(medicines.router)

This keeps endpoint registration explicit and makes shared authentication, authorization, or rate-limiting requirements visible at the router level instead of repeating them on every endpoint.

6. Agent implementation rules

Before modifying the backend, every agent must:

Read the relevant existing code and understand the feature or resource being changed.

Keep the Lumora application context and current architecture in mind before proposing changes.

Identify the smallest reasonable implementation scope.

Keep the change localized to the smallest reasonable part of the codebase.

Respect the dependency direction between API, services, repositories, and database code.

Never import API/router code from a service.

Keep Pydantic schemas separate from ORM models.

Add or update the corresponding tests for every behavioral task.

Place those tests in the mirrored tests/ location.

Run the relevant tests and confirm they pass before considering the task complete.

Use one APIRouter per resource.

Register routers only through the project's central router/application composition point.

Avoid exposing internal database fields through API responses unless explicitly required.

Avoid creating abstractions, layers, or shared utilities unless they solve a concrete repeated need.

Do not change the project's framework, database, package manager, or architectural conventions without explicit justification.

Definition of done for an agent task

A behavioral task is complete only when:

the requested implementation is finished,

the implementation follows the established architecture,

the corresponding tests were added or updated,

the relevant test suite passes,

no unrelated files were changed unnecessarily,

API contracts and schemas remain explicit,

any new router is registered correctly,

any new dependency is recorded through uv in pyproject.toml and uv.lock,

Docker compatibility is not broken by the change.

7. Architecture violations

If a requested implementation would require breaking one of these rules, the agent must not silently bypass the architecture.

The agent must instead:

identify the conflicting rule,

explain why the implementation would violate it,

propose the smallest compliant alternative.

Architectural boundaries take priority over convenience.