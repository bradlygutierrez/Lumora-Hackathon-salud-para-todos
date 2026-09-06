# Lumora B08 Authentication Backend Design

## Goal

Complete and stabilize the Patient/Caregiver mobile authentication contract while preserving existing clients, the FastAPI layered architecture, and PostgreSQL/Neon compatibility.

## Scope

The work is restricted to `Backend/`. It covers atomic patient registration, email verification codes, login with optional TOTP MFA, password recovery/change, refresh-token sessions, safe session management, Gmail SMTP delivery, OpenAPI schemas, tests, documentation, Neon migration, and FastAPI Cloud deployment. SMS MFA and frontend changes are excluded.

## Existing-system constraints

- API modules call services; services call repositories; repositories use SQLAlchemy/database infrastructure.
- Services never import API modules.
- ORM models and Pydantic schemas remain separate.
- Existing token verification and `/auth/token` behavior remain available for backward compatibility.
- Passwords, refresh tokens, MFA secrets, recovery tokens, reset tokens, verification codes, and SMTP credentials are never stored or returned in plaintext beyond the one-time value that must be delivered to its intended recipient.
- Domain failures keep the existing `{"error":{"code","message"}}` shape; Pydantic validation keeps FastAPI's standard 422 response.

## Architecture

The existing auth and MFA feature modules remain the owners of authentication behavior. `AuthService` coordinates account, password, and session workflows through `AuthRepository`. `MfaService` remains the sole owner of TOTP challenge creation and consumption through `MfaRepository`; login reuses this logic instead of introducing a second challenge implementation.

Email delivery is isolated behind a small `EmailService` using Python's standard `smtplib`. Production configuration comes from environment variables. Tests inject a fake sender so no network or real credentials are required.

Service methods used inside a larger transaction flush but do not commit. The top-level registration service commits once and rolls back on any exception.

## Atomic patient registration

`POST /api/v1/auth/register` is public and accepts an explicit nested Pydantic DTO containing account data, personal data, primary address, optional blood type, emergency contact, and both consent flags.

Validation occurs before persistence where possible:

- Normalize username and email using existing conventions.
- Validate email through Pydantic's email type.
- Apply one shared password policy to registration, reset, and change-password.
- Require `accept_terms is True` and `accept_privacy is True`.
- Reject duplicate username/email with stable conflict codes.
- Verify active sex and blood-type catalog references.
- Resolve the existing `Paciente` role.

One database transaction creates `Persona`, `Usuario`, primary `Direccion`, `Paciente`, `ContactoEmergencia`, the patient role association, and an email-verification code. A downstream failure rolls back every insert. The response contains entity IDs, email verification status, and account status but no secrets.

Consent is required but not persisted because the current requirements do not define legal-document versions or an audit model. Persisting consent without those fields would create misleading compliance data.

## Email verification and delivery

Registration generates a cryptographically random six-digit code. Only its SHA-256 hash is stored. The code expires using a configurable minute duration, is single-use, and is sent to the registered email through Gmail SMTP.

`POST /api/v1/auth/verify-email` accepts either the new `{email, code}` form or the existing `{token}` form through an explicit request union, preserving old clients. Successful verification sets `email_verificado`, consumes the matching verification, and invalidates other active verifications for that user.

`POST /api/v1/auth/resend-verification` always returns a generic success message. For an existing unverified account, it invalidates prior active codes, enforces a configurable resend cooldown from persisted timestamps, creates a replacement code, and sends it. Missing or already verified accounts do not disclose account existence. Excessive valid-account resends return 429 with a stable domain error.

The existing `verificaciones_correo` table can securely hold code hashes and timestamps. A migration adds only the fields or indexes proven necessary after model inspection, specifically a verification kind and resend lookup index if needed; it does not create a parallel token table.

SMTP configuration:

- `SMTP_HOST` defaults to `smtp.gmail.com`.
- `SMTP_PORT` defaults to `587`.
- `SMTP_USERNAME`, `SMTP_APP_PASSWORD`, and `EMAIL_FROM` are deployment secrets/configuration.
- TLS is mandatory.
- Missing SMTP configuration fails startup or delivery explicitly in production; tests use injection.

No SMTP secret is committed, logged, included in exceptions, or exposed through OpenAPI.

## Login and TOTP MFA

`POST /api/v1/auth/login` authenticates once and records the existing login audit metadata.

Without active MFA it returns:

```json
{
  "mfa_required": false,
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "bearer"
}
```

With active TOTP it creates an existing-model MFA challenge and returns:

```json
{
  "mfa_required": true,
  "challenge_token": "...",
  "expires_in": 300
}
```

No access or refresh token is issued before MFA succeeds. `/auth/mfa/verify` consumes the user-bound, expiring, attempt-limited challenge and returns the standard token pair. Consumed or expired challenges cannot be reused. Existing `/auth/mfa/challenge` remains available for compatibility and delegates to the same challenge creation path.

`GET /api/v1/auth/mfa/methods` documents TOTP/Authenticator App as the only supported B08 method. Existing setup, disable, recovery-code, and verify behavior remains.

## Password lifecycle

`POST /auth/forgot-password` keeps a generic response. Existing reset tokens remain random, hashed at rest, expiring, and single-use; email delivery sends the reset link/token only to the intended address.

`POST /auth/reset-password` applies the shared password policy, consumes the token, updates the hash, and revokes every active session for that user.

`POST /auth/change-password` is authenticated, verifies the current password, rejects the same password, applies the shared policy, updates the hash, and revokes every other session while preserving the current session.

## Session lifecycle and refresh

The access token's session claim identifies the current session. `GET /auth/sessions` returns a wrapper with safe metadata only: ID, parsed device name/platform where practical, IP, last activity, creation time, and `is_current`. Refresh-token hashes and internal security fields are excluded.

`DELETE /auth/sessions/{session_id}` soft-revokes an owned session. A session belonging to another user is reported as not found to avoid enumeration. Re-revocation is idempotent where the existing error conventions allow it.

`POST /auth/logout-others` revokes all active sessions for the authenticated user except the current one. Existing `/logout` revokes the current session; existing `/logout-all` revokes all sessions including the current one, and this distinction is documented.

`POST /auth/refresh` preserves the existing body and response. It rotates the refresh token under a row lock, making the old token immediately unusable, and updates last-used, IP, and user-agent metadata. Revoked and expired sessions fail with a stable invalid-token error.

## Error handling

New domain errors extend the existing `DomainError` hierarchy and keep stable machine-readable codes. Expected mappings include validation 422, invalid credentials 401, unauthorized access 401/403 following existing dependencies, missing owned resources 404, duplicates 409, rejected domain requests 400, resend throttling 429, and unexpected failures 500.

No error identifies whether an arbitrary email is registered. Login errors do not distinguish unknown login from incorrect password.

## Files expected to change

- `src/lumora_api/api/v1/auth.py`
- `src/lumora_api/api/v1/mfa.py`
- `src/lumora_api/schemas/auth.py`
- `src/lumora_api/schemas/mfa.py`
- `src/lumora_api/schemas/__init__.py`
- `src/lumora_api/services/auth_service.py`
- `src/lumora_api/services/mfa_service.py`
- `src/lumora_api/services/email_service.py` (new)
- `src/lumora_api/repositories/auth_repository.py`
- `src/lumora_api/repositories/mfa_repository.py` only if challenge reuse requires a query addition
- `src/lumora_api/models/auth.py` only for migration-backed verification metadata
- `src/lumora_api/core/config.py`
- `src/lumora_api/core/exceptions.py`
- `.env.example`
- mirrored auth/MFA API, service, and repository tests
- one Alembic migration if the final model audit confirms required verification metadata/indexes
- `docs/B08_AUTH_BACKEND_CONTRACT.md`
- `README.md`

Files outside `Backend/` are excluded.

## Testing strategy

Implementation follows red-green-refactor. Tests cover successful registration, all requested registration failures, transaction rollback, code verification/resend/expiry/reuse, both login branches, MFA challenge failures and success, forgot/reset/change password, session ownership and revocation, refresh rotation/revocation, safe response serialization, email sender behavior, and OpenAPI contract shapes.

Unit/service tests use SQLite and injected email fakes. No test sends real mail or modifies Neon. The final gate runs the full `uv run pytest` suite, migration-head checks, a clean-database Alembic upgrade test where available, and configured lint/type checks (none are currently declared in `pyproject.toml`).

## Deployment

After tests and migration verification pass, the branch is committed and pushed as requested by the repository workflow. Neon receives the Alembic upgrade before application rollout. FastAPI Cloud receives non-secret SMTP configuration plus `SMTP_USERNAME` and `SMTP_APP_PASSWORD` as protected secrets. Deployment is verified through its health endpoint/OpenAPI and a non-destructive authentication contract smoke test. Real email delivery is tested only with an address authorized by the user.

Deployment failure does not trigger rollback of user data or destructive Git operations; the branch and migration evidence remain available for diagnosis.

## Explicit limitations

- B08 supports TOTP only; SMS MFA is not advertised or implemented.
- Gmail SMTP is appropriate for the hackathon but has provider sending limits and is not a durable high-volume transactional-email solution.
- Consent acceptance is validated but not stored until document versioning and audit requirements are defined.
