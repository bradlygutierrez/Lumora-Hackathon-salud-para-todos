# B09 Patient/Caregiver Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Deliver safe current-user, patient-self, and caregiver-linked-patient context APIs with centralized authorization for Lumora B09.

**Architecture:** Extend the existing identity/reminder relationship path. Repositories own relationship and patient queries, `PatientAccessService` owns role-aware authorization, and routers pass authenticated users explicitly. Existing staff RBAC remains authoritative; mobile routes expose only safe DTOs.

**Tech Stack:** FastAPI, Pydantic 2, SQLAlchemy async, PostgreSQL/Neon, Alembic, pytest, uv.

**Spec:** `Backend/docs/superpowers/specs/2026-08-27-b09-patient-caregiver-backend-design.md`

## Global Constraints

- Modify only `Backend/`; never stage or edit Frontend.
- Preserve API → service → repository → database dependency direction.
- Never trust a client patient ID without checking the authenticated user and relationship state.
- Keep ORM models and Pydantic schemas separate.
- Preserve existing staff/admin RBAC and legacy route compatibility where safe.
- Unauthorized patient context returns the existing not-found domain error.
- No clinical fields are returned by caregiver context APIs.

---

### Task 1: Relationship lifecycle model and migration

**Files:**
- Modify: `Backend/src/lumora_api/models/reminders.py`
- Modify: `Backend/src/lumora_api/schemas/reminders.py`
- Create: `Backend/migrations/versions/20260827_10_b09_relationship_lifecycle.py`
- Test: `Backend/tests/models/test_patient_relationship.py`
- Test: `Backend/tests/repositories/test_reminder_repository.py`

**Interfaces:**
- `RelacionPaciente.estado`, `nivel_acceso`, and `expira_en`.
- Repository query returning only active, non-expired relationships.

- [ ] Write failing model/repository tests for active, pending, revoked, inactive, rejected, and expired relationships.
- [ ] Run focused tests and confirm missing fields/query behavior fails.
- [ ] Add fields with compatibility defaults (`estado="active"`, `nivel_acceso="read"`, nullable `expira_en`) and a reversible Alembic migration.
- [ ] Add repository methods that join `RelacionPaciente`, `Paciente`, `Persona`, and `TipoRelacion` without returning clinical data.
- [ ] Run focused tests and `uv run alembic heads`; require one head.
- [ ] Commit `feat: add caregiver relationship lifecycle`.

### Task 2: Current-user and patient-self context

**Files:**
- Modify: `Backend/src/lumora_api/schemas/identity.py`
- Modify: `Backend/src/lumora_api/schemas/__init__.py`
- Modify: `Backend/src/lumora_api/api/v1/auth.py`
- Modify: `Backend/src/lumora_api/api/v1/patients.py`
- Create or modify: `Backend/src/lumora_api/services/patient_access_service.py`
- Test: `Backend/tests/api/v1/test_auth.py`
- Test: `Backend/tests/api/v1/test_identity.py`
- Test: `Backend/tests/services/test_patient_access_service.py`

**Interfaces:**
- `GET /api/v1/auth/me -> UserRead` or dedicated safe current-user DTO.
- `GET /api/v1/patients/me -> PatientContextRead`.
- `PatientAccessService.own_patient_id(user_id)`.

- [ ] Add failing tests for safe `/auth/me`, invalid bearer, patient self context, and missing patient profile.
- [ ] Implement DTOs that exclude password hashes, tokens, MFA secrets, and internal fields.
- [ ] Implement authenticated routes using `CurrentUser` only; never decode `sub` in application code.
- [ ] Run focused API/service tests.
- [ ] Commit `feat: add current user and patient self context`.

### Task 3: Caregiver linked-patient endpoint

**Files:**
- Modify: `Backend/src/lumora_api/repositories/reminders.py`
- Modify: `Backend/src/lumora_api/services/patient_access_service.py`
- Create: `Backend/src/lumora_api/api/v1/caregivers.py`
- Modify: `Backend/src/lumora_api/api/v1/router.py`
- Create or modify: `Backend/src/lumora_api/schemas/caregivers.py`
- Test: `Backend/tests/api/v1/test_caregivers.py`
- Test: `Backend/tests/services/test_patient_access_service.py`
- Test: `Backend/tests/repositories/test_reminder_repository.py`

**Interfaces:**
- `GET /api/v1/caregivers/me/patients -> CaregiverPatientList`.
- `PatientAccessService.linked_patients(user_id) -> list[CaregiverPatientRead]`.

- [ ] Add failing tests for active linked, empty, other caregiver, pending, revoked, inactive, rejected, and expired relationships.
- [ ] Add caregiver-role enforcement and return 403 for non-caregivers according to existing conventions.
- [ ] Project `TipoRelacion.nombre` into `relationship`; return patient ID/names/status/access level only.
- [ ] Register the APIRouter at the central integration point.
- [ ] Run focused tests and OpenAPI schema checks.
- [ ] Commit `feat: expose caregiver linked patients`.

### Task 4: Central patient-access guard and route integration

**Files:**
- Modify: `Backend/src/lumora_api/api/dependencies.py`
- Modify: `Backend/src/lumora_api/services/patient_access_service.py`
- Modify: `Backend/src/lumora_api/api/v1/patients.py`
- Modify: `Backend/src/lumora_api/api/v1/emergency_contacts.py`
- Modify: `Backend/src/lumora_api/api/v1/reminders.py`
- Modify: `Backend/src/lumora_api/api/v1/patient_clinical.py`
- Modify: `Backend/src/lumora_api/api/v1/appointments.py` where patient IDs are accepted
- Test: mirrored API and service tests for each integrated route

**Interfaces:**
- `require_patient_access(current_user, patient_id, action="read")`.
- Guard allows patient self, active caregiver links, and existing staff permission paths.

- [ ] Add failing IDOR tests for patient-other, caregiver-unlinked, caregiver-revoked, and arbitrary IDs.
- [ ] Implement one guard/dependency backed by repository queries; do not duplicate role checks in routers.
- [ ] Restrict `GET /pacientes` to existing staff/admin permissions and preserve staff behavior.
- [ ] Apply the guard to directly exposed patient-scoped routes; document any legacy routes that remain staff-only or require later migration.
- [ ] Run the complete affected API suite and inspect 401/403/404 error shapes.
- [ ] Commit `feat: enforce patient scoped authorization`.

### Task 5: Documentation, migration, OpenAPI, and production verification

**Files:**
- Create: `Backend/docs/B09_PATIENT_CONTEXT_CONTRACT.md`
- Modify: `Backend/README.md` if endpoint documentation exists there
- Modify: OpenAPI tests under `Backend/tests/api/v1/`

- [ ] Add failing OpenAPI assertions for `/auth/me`, `/patients/me`, `/caregivers/me/patients`, auth requirements, and secret-field absence.
- [ ] Document DTOs, authorization matrix, relationship lifecycle, and migrated patient-scoped routes.
- [ ] Run `uv run pytest`, `uv run alembic upgrade head`, `uv run alembic heads`, and `uv run alembic current` against Neon.
- [ ] Run `git diff --check`, inspect staged paths, and verify no Frontend path is staged.
- [ ] Deploy the branch through the existing FastAPI Cloud app and smoke-test root/OpenAPI plus non-destructive unauthorized requests.
- [ ] Commit `docs: document B09 patient context contract`.
