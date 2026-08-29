# B11 Self Profile and Account Design

## Purpose

Provide a safe, authenticated self-account API for the mobile patient and caregiver profiles.  The account identity is always derived from the access token and is independent of any B09 selected patient context.

## API contract

`GET /api/v1/account/me` returns an explicit account projection:

```json
{
  "id": 12,
  "username": "ana.lopez",
  "email": "ana@example.com",
  "email_verified": true,
  "profile_image_url": null,
  "person": {
    "id": 21,
    "first_names": "Ana",
    "last_names": "López",
    "birth_date": "1998-04-10",
    "phone": "88888888",
    "email": "ana@example.com",
    "sex_id": 1,
    "addresses": []
  },
  "roles": [{ "id": 1, "name": "Paciente" }]
}
```

`PATCH /api/v1/account/me` accepts only `username`, `email`, and the optional `person` object containing `first_names`, `last_names`, `birth_date`, `phone`, and `sex_id`.  Schemas reject unrecognised properties with 422.  Username and email are trimmed and lower-cased as registration does.  Existing username/email conflicts return 409; schema, date, email, length, and unknown-field violations return 422.

No self-account endpoint accepts a user ID.  It never exposes credentials, MFA data, sessions, permissions, audit metadata, or soft-delete state.

## Persistence and storage

Add nullable `personas.profile_image_url` via a single Alembic revision.  `ProfileImageStorage` is the service boundary.  The configured development implementation writes generated random-name JPEG/PNG/WebP files to a local directory and returns a configured public URL prefix.  The FastAPI application serves that configured directory only in development.  Production must provide a durable remote adapter (and public URL/CDN configuration); local container disk is not durable production storage.

`POST /api/v1/account/me/profile-image` consumes `multipart/form-data` field `file`, accepts JPEG, PNG, or WebP only, checks the claimed media type and file signature, and rejects files over 5 MiB.  It stores the replacement then deletes the previous storage object after database persistence.  `DELETE /api/v1/account/me/profile-image` clears the database URL and removes a local storage object when owned by the configured adapter.  Tests use an in-memory fake adapter.

## Authorization and existing patient data

Both patients and caregivers may read and modify only their own account identity.  A caregiver's selected B09 `patientContext` is not consulted.  Patient health data remains patient-scoped: existing B09-protected patient, emergency-contact, and health-measurement routes retain responsibility for blood type, weight, contacts, and caregiver read/write levels.  Height is not added because no established source exists.

The generic `/usuarios` CRUD is administrative and requires the existing user-management permission dependencies; patient and caregiver tokens cannot enumerate, read, edit, or delete arbitrary users.  Mobile self-service uses `/account/me`, not `/usuarios/{id}`.

## Consistency and tests

The account update transaction persists both user and person changes, so subsequent `/account/me` and `/auth/me` reads use fresh database state without token rotation.  Registration terms/privacy and session/logout behavior are regression-tested, not redesigned.

Tests cover patient and caregiver self identity, payload allowlists, conflict and validation status codes, image lifecycle with fake storage, generic user RBAC, existing B09 boundaries, registration acceptance, session/profile read consistency, migration head integrity, and the complete suite.
