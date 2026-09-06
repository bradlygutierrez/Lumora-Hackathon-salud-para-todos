# Lumora B08 Authentication Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete B08 patient authentication, verification, MFA, password, and session contract and deploy it safely to Neon and FastAPI Cloud.

**Architecture:** Extend the existing auth/MFA feature path without introducing a parallel subsystem. Public routers use explicit Pydantic DTOs, services own transactions and security rules, repositories own queries, existing ORM models remain the database source of truth, and a standard-library SMTP adapter delivers one-time values.

**Tech Stack:** Python 3.14, FastAPI, Pydantic 2, SQLAlchemy async, PostgreSQL/Neon, Alembic, pytest, Gmail SMTP, FastAPI Cloud.

**Spec:** `Backend/docs/superpowers/specs/2026-08-27-b08-auth-backend-design.md`

## Global Constraints

- Modify only `Backend/`; never stage or edit either frontend.
- Preserve API -> services -> repositories -> database dependency direction.
- Keep ORM models separate from Pydantic schemas.
- Use TDD for every behavior change and retain old token verification and OAuth2 endpoints.
- Never persist plaintext credentials, refresh tokens, MFA secrets, reset tokens, verification tokens, or verification codes.
- Keep the existing domain-error response and FastAPI validation response formats.
- Do not add a mail dependency; use Python's standard library.
- TOTP is the only supported B08 MFA method.

---

### Task 1: Shared schemas, password policy, configuration, and SMTP delivery

**Files:**
- Modify: `Backend/src/lumora_api/core/config.py`
- Modify: `Backend/src/lumora_api/core/security.py`
- Modify: `Backend/src/lumora_api/core/exceptions.py`
- Modify: `Backend/src/lumora_api/schemas/auth.py`
- Modify: `Backend/src/lumora_api/schemas/mfa.py`
- Modify: `Backend/src/lumora_api/schemas/__init__.py`
- Create: `Backend/src/lumora_api/services/email_service.py`
- Modify: `Backend/.env.example`
- Test: `Backend/tests/core/test_config.py`
- Test: `Backend/tests/core/test_security.py`
- Create: `Backend/tests/services/test_email_service.py`

**Interfaces:**
- Produces: `validate_password_policy(value: str) -> str`, registration/login/password/session DTOs, `EmailService.send_verification_code(email, code)` and `send_password_reset(email, token)`.
- Consumes: existing `Settings`, `DomainError`, token helpers, Pydantic schema exports.

- [ ] **Step 1: Write failing tests** asserting weak passwords are rejected consistently, SMTP settings load without exposing the password, and an injected SMTP fake receives TLS/login/send calls while message bodies contain only the intended one-time value.
- [ ] **Step 2: Run `uv run pytest tests/core/test_config.py tests/core/test_security.py tests/services/test_email_service.py -v`** and confirm failures are caused by missing interfaces.
- [ ] **Step 3: Implement minimal shared validation and DTOs.** Add settings for verification-code TTL/cooldown and SMTP host/port/user/app-password/from address. Add domain errors only where existing classes cannot express 429. Implement `EmailService` with `smtplib.SMTP`, `starttls()`, `login()`, and `EmailMessage`; accept an SMTP factory for tests.
- [ ] **Step 4: Re-run the focused tests** and confirm they pass.
- [ ] **Step 5: Commit only Task 1 backend files** with `feat: define B08 auth contracts and email delivery`.

### Task 2: Atomic patient registration

**Files:**
- Modify: `Backend/src/lumora_api/repositories/auth_repository.py`
- Modify: `Backend/src/lumora_api/services/auth_service.py`
- Modify: `Backend/src/lumora_api/api/v1/auth.py`
- Test: `Backend/tests/repositories/test_auth_repository.py`
- Test: `Backend/tests/services/test_auth_service.py`
- Test: `Backend/tests/api/v1/test_auth.py`

**Interfaces:**
- Consumes: `PatientRegistrationRequest`, existing Persona/Usuario/Direccion/Paciente/ContactoEmergencia/Rol/catalog models, `hash_password`, email sender.
- Produces: `AuthService.register_patient(data) -> RegistrationResponse`; public `POST /api/v1/auth/register`.

- [ ] **Step 1: Add failing API/service tests** for success, duplicate email, duplicate username, invalid sex, invalid blood type, weak password, missing terms, missing privacy, and a downstream contact failure that leaves no Persona/Usuario/Paciente rows.
- [ ] **Step 2: Run the registration tests** and confirm 404/missing behavior fails for the intended reason.
- [ ] **Step 3: Add repository lookups** for duplicate identifiers, catalogs, and patient role without committing.
- [ ] **Step 4: Implement one service transaction.** Build every ORM entity, flush for IDs, create the hashed verification code, perform one commit after all entities exist, and call rollback on exceptions. Convert uniqueness races into stable 409 domain errors. Deliver email only after a successful commit so an SMTP outage cannot leave an uncommitted transaction; surface delivery status without returning the code.
- [ ] **Step 5: Add the public route with explicit response model and status 201.**
- [ ] **Step 6: Run registration repository/service/API tests** and confirm all pass.
- [ ] **Step 7: Commit** with `feat: add atomic patient registration`.

### Task 3: Six-digit email verification and resend

**Files:**
- Modify: `Backend/src/lumora_api/models/auth.py` only if required by the final query design
- Modify: `Backend/src/lumora_api/repositories/auth_repository.py`
- Modify: `Backend/src/lumora_api/services/auth_service.py`
- Modify: `Backend/src/lumora_api/api/v1/auth.py`
- Create: `Backend/migrations/versions/<revision>_b08_email_verification_codes.py` only if model metadata changes
- Test: `Backend/tests/repositories/test_auth_repository.py`
- Test: `Backend/tests/services/test_auth_service.py`
- Test: `Backend/tests/api/v1/test_auth.py`

**Interfaces:**
- Produces: `verify_email_code(email, code)`, preserved `verify_email_token(token)`, `resend_verification(email)`, and generic resend response.

- [ ] **Step 1: Add failing tests** for valid, wrong, expired, reused, resent/replaced, throttled, and already-verified cases plus the legacy token request.
- [ ] **Step 2: Run focused tests** and observe contract failures.
- [ ] **Step 3: Implement repository queries** that lock and resolve active verification hashes by user and invalidate other active rows.
- [ ] **Step 4: Implement service behavior** using `secrets.randbelow(1_000_000)` formatted to six digits, `hash_token`, expiration, one-use consumption, generic resend for unknown/already-verified emails, and cooldown enforcement.
- [ ] **Step 5: Add/adjust Alembic migration only if Task 3 introduces persisted metadata.** Set its `down_revision` to the current single head and provide reversible downgrade.
- [ ] **Step 6: Run focused tests and `uv run alembic heads`**; require one head.
- [ ] **Step 7: Commit** with `feat: add email verification codes`.

### Task 4: Predictable login and TOTP MFA

**Files:**
- Modify: `Backend/src/lumora_api/services/auth_service.py`
- Modify: `Backend/src/lumora_api/services/mfa_service.py`
- Modify: `Backend/src/lumora_api/repositories/mfa_repository.py` if a user-bound creation query is missing
- Modify: `Backend/src/lumora_api/api/v1/auth.py`
- Modify: `Backend/src/lumora_api/api/v1/mfa.py`
- Test: `Backend/tests/services/test_auth_service.py`
- Test: `Backend/tests/services/test_mfa_service.py`
- Test: `Backend/tests/api/v1/test_auth.py`
- Test: `Backend/tests/api/v1/test_mfa.py`

**Interfaces:**
- Produces: login response union with `mfa_required`; one shared `MfaService.create_challenge_for_user(user)` path; token pair only after challenge consumption.

- [ ] **Step 1: Add failing tests** for login without MFA, login with MFA, invalid password, invalid/expired/reused challenge, attempt limit, successful MFA token pair, and methods exposing TOTP only.
- [ ] **Step 2: Run focused auth/MFA tests** and confirm expected contract failures.
- [ ] **Step 3: Refactor challenge creation behind one MFA service method** and make both login and legacy challenge route delegate to it.
- [ ] **Step 4: Return discriminated Pydantic responses** from `/auth/login`; do not create a session for the MFA branch until verify/recovery succeeds.
- [ ] **Step 5: Preserve attempt, expiry, user binding, recovery-code, and single-use logic** and document TOTP as the only supported method.
- [ ] **Step 6: Run focused tests** and confirm pass.
- [ ] **Step 7: Commit** with `feat: stabilize login MFA contract`.

### Task 5: Password recovery and authenticated password change

**Files:**
- Modify: `Backend/src/lumora_api/repositories/auth_repository.py`
- Modify: `Backend/src/lumora_api/services/auth_service.py`
- Modify: `Backend/src/lumora_api/api/v1/auth.py`
- Test: `Backend/tests/services/test_auth_service.py`
- Test: `Backend/tests/api/v1/test_auth.py`

**Interfaces:**
- Produces: emailed reset flow; `change_password(user_id, current_session_id, current_password, new_password)`; session revocation semantics.

- [ ] **Step 1: Add failing tests** for generic forgot response, hashed/expiring/single-use reset, weak reset password, all-session revocation after reset, successful change, wrong current password, weak/same new password, and preservation only of current session.
- [ ] **Step 2: Run password tests** and observe missing behavior.
- [ ] **Step 3: Reuse shared policy and existing token hashing.** Send reset mail after token persistence; never expose token in route response.
- [ ] **Step 4: Revoke all sessions after reset; add repository `revoke_others(user_id, current_session_id)` and use it after authenticated change.**
- [ ] **Step 5: Add `POST /auth/change-password`** with `CurrentUser` and `CurrentSessionId` dependencies.
- [ ] **Step 6: Run password tests** and confirm pass.
- [ ] **Step 7: Commit** with `feat: complete password security flows`.

### Task 6: Active-session management and refresh guarantees

**Files:**
- Modify: `Backend/src/lumora_api/repositories/auth_repository.py`
- Modify: `Backend/src/lumora_api/services/auth_service.py`
- Modify: `Backend/src/lumora_api/api/v1/auth.py`
- Test: `Backend/tests/repositories/test_auth_repository.py`
- Test: `Backend/tests/services/test_auth_service.py`
- Test: `Backend/tests/api/v1/test_auth.py`

**Interfaces:**
- Produces: safe session wrapper/read DTO; `revoke_session`, `logout_others`; current-session marker; preserved rotating `/refresh`.

- [ ] **Step 1: Add failing tests** for safe own-session list, current marker, revoke one, foreign session hidden, idempotent re-revoke, logout others, logout-all semantics, rotation, old-token failure, and refresh failure after revocation.
- [ ] **Step 2: Run session tests** and confirm failures.
- [ ] **Step 3: Implement ownership-scoped repository operations and safe response mapping.** Derive platform/device conservatively from user-agent without a new dependency; fall back to `Unknown`.
- [ ] **Step 4: Add `DELETE /auth/sessions/{session_id}` and `POST /auth/logout-others`.** Pass current session ID to listing and logout-others.
- [ ] **Step 5: Preserve row-locked refresh rotation and ensure last activity/IP/user-agent update.**
- [ ] **Step 6: Run session/refresh tests** and confirm pass.
- [ ] **Step 7: Commit** with `feat: add secure session controls`.

### Task 7: Documentation, OpenAPI, migration, and full local verification

**Files:**
- Create: `Backend/docs/B08_AUTH_BACKEND_CONTRACT.md`
- Modify: `Backend/README.md`
- Test: `Backend/tests/api/v1/test_auth.py`
- Test: `Backend/tests/api/v1/test_mfa.py`

**Interfaces:**
- Produces: durable mobile contract and accurate generated OpenAPI.

- [ ] **Step 1: Add failing OpenAPI assertions** for every new route, request schema, login response alternatives, auth requirement, and absence of secret fields.
- [ ] **Step 2: Run OpenAPI tests** and confirm missing descriptions/contracts fail.
- [ ] **Step 3: Add concise contract documentation** covering endpoints, payloads, errors, registration transaction, MFA flow, Gmail delivery, and session lifecycle.
- [ ] **Step 4: Update README setup/deployment variables and endpoint summary.**
- [ ] **Step 5: Run `uv run pytest`** and require zero failures.
- [ ] **Step 6: Run `uv run alembic heads`, `uv run alembic upgrade head`, and `uv run alembic current` against the configured Neon database** only after the SQLite suite is green; require a single matching head.
- [ ] **Step 7: Run project lint/type commands if configuration was added; otherwise record that none are configured.**
- [ ] **Step 8: Run `git diff --check` and inspect `git diff -- Backend`; verify no secret or frontend path is staged.**
- [ ] **Step 9: Commit** with `docs: document B08 auth backend contract`.

### Task 8: FastAPI Cloud deployment and smoke verification

**Files:**
- Modify only existing FastAPI Cloud configuration under `Backend/.fastapicloud/` if deployment tooling requires it and the file contains no secret.

**Interfaces:**
- Consumes: green branch, migrated Neon database, user-provided FastAPI Cloud secrets.
- Produces: deployed B08 backend and verification evidence.

- [ ] **Step 1: Inspect the existing FastAPI Cloud project/service configuration and CLI status** without changing deployment state.
- [ ] **Step 2: Confirm required production variables exist as protected secrets:** `DATABASE_URL`, `JWT_SECRET`, `SMTP_USERNAME`, `SMTP_APP_PASSWORD`, `EMAIL_FROM`; never print values.
- [ ] **Step 3: Apply the verified Alembic migration to Neon** and confirm remote current equals local head.
- [ ] **Step 4: Deploy the current feature commit through the repository's existing FastAPI Cloud workflow.** Do not modify frontend deployment targets.
- [ ] **Step 5: Verify deployment health, OpenAPI route presence, and a non-destructive login/validation smoke request.** Send a real email only to an address explicitly authorized by the user.
- [ ] **Step 6: Re-run local `uv run pytest` and inspect branch status before reporting completion.**
- [ ] **Step 7: Report deployment URL/revision, exact test counts, migration revision, secrets still requiring user action, and any provider limitation.**
