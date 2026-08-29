# B11 Profile Account Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a secure self-scoped profile API and profile-image lifecycle for Lumora mobile patients and caregivers.

**Architecture:** Account routes derive identity from `CurrentUser`, then call `AccountService` and `AccountRepository`. Profile storage is behind `ProfileImageStorage`, using a development-only local adapter and in-memory fake tests. B09 patient health/contact routes remain patient-scoped.

**Tech Stack:** FastAPI, Pydantic v2, SQLAlchemy async, Alembic, pytest.

**Spec:** `docs/superpowers/specs/2026-08-28-b11-profile-account-design.md`

## Global Constraints

- Modify only Backend; do not alter Frontend.
- Do not accept user IDs for account operations; only use `CurrentUser.id`.
- Reject unknown PATCH fields with 422 and uniqueness conflicts with 409.
- Do not expose security, token, permission, audit, or soft-delete fields.
- Only permit signature-matching JPEG, PNG, WebP under 5 MiB.
- Use no external storage credentials or networked tests.
- Preserve B09 authorization, registration consent rules, and logout behavior.

---

## File Structure

- `schemas/account.py`: explicit read/update schemas.
- `repositories/account_repository.py`: own-user projection and uniqueness/catalog lookups.
- `services/account_service.py`: allowlisted account mutation and image lifecycle.
- `services/profile_image_storage.py`: local development storage abstraction.
- `api/v1/account.py`: thin authenticated endpoints.
- `api/v1/users.py`: generic administrative user RBAC.
- `models/identity.py` + migration: nullable `Persona.profile_image_url`.
- `tests/api/v1/test_account.py`: self profile and image behavior.
- `docs/B11_PROFILE_ACCOUNT_BACKEND_CONTRACT.md`: mobile integration contract.

### Task 1: Establish account schema, persistence, and tests

**Files:**
- Create: `tests/api/v1/test_account.py`
- Modify: `src/lumora_api/schemas/account.py`
- Modify: `src/lumora_api/repositories/account_repository.py`
- Modify: `src/lumora_api/services/account_service.py`
- Modify: `src/lumora_api/models/identity.py`
- Create: `migrations/versions/<revision>_b11_profile_image.py`

**Interfaces:**
- Produces `AccountRead`, `AccountUpdate`, `AccountService.get(user_id)`, and `AccountService.update(user_id, data)`.

- [ ] **Step 1: Write failing self-account tests**

```python
async def test_account_me_returns_own_explicit_identity(client, session_factory):
    user = await create_account_user(client, session_factory, "patient")
    response = await client.get("/api/v1/account/me", headers=auth_headers(user["id"]))
    assert response.status_code == 200
    assert response.json()["id"] == user["id"]
    assert set(response.json()) == {"id", "username", "email", "email_verified", "profile_image_url", "person", "roles"}
```

Include patient and caregiver identity, caregiver-vs-linked-patient identity, unauthenticated 401, allowed updates, duplicate email/username 409, malformed/unknown fields 422, password/roles/activo/IDs forbidden, and immediate account/auth read consistency.

- [ ] **Step 2: Run focused test before implementation**

Run: `uv run pytest tests/api/v1/test_account.py -v`

Expected: FAIL because the complete account contract does not yet exist.

- [ ] **Step 3: Implement explicit allowlist schemas and repository projection**

```python
class AccountUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    username: str | None = Field(default=None, min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_.-]+$")
    email: EmailStr | None = None
    person: AccountPersonUpdate | None = None
```

Load only active non-deleted user, persona, addresses, and roles. Add nullable `profile_image_url` to `Persona`. Create a revision based on the current head that adds/drops only the column.

- [ ] **Step 4: Implement transactional update**

Normalize username/email with `.strip().lower()`, synchronize the person email, validate non-null `sex_id`, map only first/last names, birth date, phone, and sex ID, and turn `IntegrityError` into `ResourceConflictError`. Reload after commit.

- [ ] **Step 5: Run tests and commit**

Run: `uv run pytest tests/api/v1/test_account.py -v`

Expected: PASS after the HTTP routes from Task 2 are wired.

```bash
git add src/lumora_api/models/identity.py src/lumora_api/schemas/account.py src/lumora_api/repositories/account_repository.py src/lumora_api/services/account_service.py migrations/versions tests/api/v1/test_account.py
git commit -m "feat(account): add self profile persistence"
```

### Task 2: Expose self routes and protect generic users

**Files:**
- Modify: `src/lumora_api/api/v1/account.py`
- Modify: `src/lumora_api/api/v1/router.py`
- Modify: `src/lumora_api/api/v1/users.py`
- Modify: `tests/api/v1/test_account.py`
- Modify: `tests/api/v1/test_identity.py`

**Interfaces:**
- Consumes `CurrentUser`, `AccountService.get/update`, and existing `require_permission`.
- Produces authenticated `GET/PATCH /api/v1/account/me` plus protected generic user CRUD.

- [ ] **Step 1: Write failing route and IDOR tests**

```python
async def test_caregiver_account_never_returns_linked_patient_person(client, session_factory):
    caregiver, patient = await create_caregiver_and_linked_patient(client, session_factory)
    response = await client.get("/api/v1/account/me", headers=auth_headers(caregiver["id"]))
    assert response.json()["person"]["id"] == caregiver["persona"]["id"]
    assert response.json()["person"]["id"] != patient["persona"]["id"]
```

Assert an unprivileged Patient/Caregiver gets 403 for generic list, get, patch, and delete users while an administrator with the existing required permission still succeeds.

- [ ] **Step 2: Run focused tests**

Run: `uv run pytest tests/api/v1/test_account.py tests/api/v1/test_identity.py -k "account or generic" -v`

Expected: FAIL before account routes and generic route dependencies are complete.

- [ ] **Step 3: Implement thin routes**

```python
@router.get("/me", response_model=AccountRead)
async def get_account(current_user: CurrentUser, session: SessionDep) -> AccountRead:
    return await service(session).get(current_user.id)
```

Implement the matching PATCH route, register the account router centrally, and never read B09 patient context.

- [ ] **Step 4: Apply real existing generic user permission(s)**

Apply the existing user-management read permission to GET if one exists and `usuarios:editar` to mutations; otherwise use `usuarios:editar` consistently. Do not invent a permission. Update existing legitimate test fixtures.

- [ ] **Step 5: Run tests and commit**

Run: `uv run pytest tests/api/v1/test_account.py tests/api/v1/test_identity.py -v`

Expected: PASS.

```bash
git add src/lumora_api/api/v1/account.py src/lumora_api/api/v1/router.py src/lumora_api/api/v1/users.py tests/api/v1/test_account.py tests/api/v1/test_identity.py
git commit -m "feat(account): secure self profile endpoints"
```

### Task 3: Implement image lifecycle

**Files:**
- Modify: `src/lumora_api/services/profile_image_storage.py`
- Modify: `src/lumora_api/services/account_service.py`
- Modify: `src/lumora_api/api/v1/account.py`
- Modify: `src/lumora_api/core/config.py`, `src/lumora_api/main.py`, `.env.example`
- Modify: `tests/api/v1/test_account.py`

**Interfaces:**
- Produces `POST/DELETE /api/v1/account/me/profile-image`, both returning `ProfileImageRead`.

- [ ] **Step 1: Write failing fake-storage tests**

```python
@pytest.mark.parametrize("mime, content", [
    ("image/jpeg", b"\xff\xd8\xff\xe0"),
    ("image/png", b"\x89PNG\r\n\x1a\n"),
    ("image/webp", b"RIFF\x00\x00\x00\x00WEBP"),
])
async def test_valid_profile_image_is_persisted(client, session_factory, mime, content):
    user = await create_account_user(client, session_factory, "image-user")
    response = await client.post("/api/v1/account/me/profile-image", headers=auth_headers(user["id"]), files={"file": ("ignored.bin", content, mime)})
    assert response.status_code == 200
    assert response.json()["profile_image_url"]
```

Use a fake recording saves/deletes. Cover unsupported MIME, signature mismatch, oversize, replacement, deletion/reset, GET persistence, unauthenticated rejection, and user isolation.

- [ ] **Step 2: Run the image tests**

Run: `uv run pytest tests/api/v1/test_account.py -k image -v`

Expected: FAIL before the endpoint and fake-storage injection are completed.

- [ ] **Step 3: Implement adapter/service/validation**

Use generated token URLs and never input filenames. Persist a new URL before cleaning the old owned object; persist null before deletion cleanup. Validate claimed MIME, read at most 5 MiB + 1 byte, then match magic bytes. Configure non-secret directory/base URL. Mount static files only in development; production requires a durable remote storage adapter.

- [ ] **Step 4: Run tests and commit**

Run: `uv run pytest tests/api/v1/test_account.py -v`

Expected: PASS.

```bash
git add src/lumora_api/services/profile_image_storage.py src/lumora_api/services/account_service.py src/lumora_api/api/v1/account.py src/lumora_api/core/config.py src/lumora_api/main.py .env.example tests/api/v1/test_account.py
git commit -m "feat(account): add profile image lifecycle"
```

### Task 4: Preserve B09/auth behavior and document B11

**Files:**
- Modify: B09 patient-access tests and `tests/api/v1/test_auth.py`
- Create: `docs/B11_PROFILE_ACCOUNT_BACKEND_CONTRACT.md`

- [ ] **Step 1: Add regressions**

Test own patient access, authorized caregiver read, unauthorized caregiver denial, denied write without B09 write access, registration false/missing consents 422, duplicate registration 409, and logout invalidation.

- [ ] **Step 2: Run regressions**

Run: `uv run pytest tests/api/v1/test_account.py tests/api/v1/test_auth.py -v`

Expected: PASS.

- [ ] **Step 3: Document contract**

Write exact GET response, PATCH request, multipart image endpoint and delete response, editable/forbidden fields, 409/422 meanings, patient/caregiver identity behavior, reused B09 endpoints, generic user RBAC, and production remote-storage requirement.

- [ ] **Step 4: Commit**

```bash
git add tests docs/B11_PROFILE_ACCOUNT_BACKEND_CONTRACT.md
git commit -m "test(account): cover profile contract regressions"
```

### Task 5: Verify full branch

- [ ] **Step 1: Verify migration topology**

Run: `uv run alembic heads`

Expected: exactly one line ending in `(head)`.

- [ ] **Step 2: Run all declared checks**

Run: `uv run pytest`

Expected: PASS. Run lint/type commands only if declared in `pyproject.toml`.

- [ ] **Step 3: Inspect scope**

```bash
git diff --check
git status --short
git log -1 --oneline
```

Expected: no whitespace errors, no frontend paths, and only intended B11 changes.

