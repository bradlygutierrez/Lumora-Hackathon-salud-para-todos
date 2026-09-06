# B08 MFA Email/TOTP Flow Implementation Plan

**Goal:** Make MFA enrollment explicit and support Email OTP and TOTP safely.

**Architecture:** Extend the existing MFA router, service, repository, models, and schemas. Reuse `EmailService` and `AuthService.create_session`; persist only hashes and consume challenges transactionally.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, Alembic, pyotp, pytest.

## Tasks

- [ ] Add failing tests for inactive TOTP setup, confirmation ownership, and recovery-code timing.
- [ ] Add failing tests for Email OTP setup, hashing, expiry, attempts, confirmation, and email delivery mocks.
- [ ] Change ORM/database defaults to inactive and add the Alembic migration.
- [ ] Implement TOTP confirmation and delayed recovery-code generation.
- [ ] Implement Email OTP setup/confirmation and method-aware login verification.
- [ ] Update schemas, routes, method listing, disable behavior, and documentation.
- [ ] Run focused MFA tests, full pytest, and `alembic heads`; commit and push the branch.
