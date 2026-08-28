# B09 Patient/Caregiver Context Backend Design

## Goal

Provide authenticated patient context resolution and caregiver-linked-patient access without exposing the patient database or trusting client-supplied ownership claims.

## Current state

- `Paciente`, `Persona`, `Usuario`, `Rol`, `TipoRelacion`, and `RelacionPaciente` already exist.
- `RelacionPaciente` currently stores only `activo`; it lacks explicit lifecycle and access-level fields.
- `/pacientes` and several patient-scoped routes do not enforce authenticated ownership or caregiver relationships.
- There are no `/auth/me`, `/patients/me`, or `/caregivers/me/patients` routes.

## Data model

Extend `relaciones_paciente` with `estado`, `nivel_acceso`, and nullable `expira_en`. `estado` is a constrained string with `pending`, `active`, `revoked`, `inactive`, and `rejected`; existing `activo` remains for backward compatibility. A relationship grants access only when `activo` is true, `estado` is `active`, and it has not expired. `nivel_acceso` defaults to `read`.

## Authorization

Add a reusable `PatientAccessService` and repository query. A patient may access only the `Paciente` row associated with their authenticated `Usuario.persona_id`. A caregiver may access only rows linked through an active, authorized `RelacionPaciente`. Staff access continues through existing permission/RBAC checks. Unauthorized patient contexts use the existing not-found domain error to avoid disclosure.

The guard receives the authenticated user and patient ID; it never accepts a caregiver ID or treats a client patient ID as proof of access. It will be applied to the B09 routes and existing patient-scoped endpoints that currently expose the same data. Generic patient listing remains staff/admin-only; mobile uses `/patients/me` and `/caregivers/me/patients`.

## API contracts

`GET /auth/me` returns a safe current-user DTO with IDs, account flags, roles, and person names. `GET /patients/me` returns the authenticated patient's safe context. `GET /caregivers/me/patients` returns only linked patients with `patient_id`, relationship label, lifecycle status, access level, and first/last names. Empty results return HTTP 200 with `items: []`.

## Error and compatibility behavior

Bearer failures remain 401. Missing role/access uses the existing 403/404 domain mechanism. Existing staff/admin flows remain available through their RBAC permissions. Legacy routes that cannot yet be migrated are documented rather than falsely described as fully guarded.

## Testing and migration

Tests cover migration/model lifecycle, repository filtering, service authorization, all new routes, enumeration prevention, role boundaries, and revoked/inactive/expired relationships. A reversible Alembic migration is required because the persisted relationship metadata changes.
