# J09 Health Staff Patients Design

## Goal
Implement the staff patient workflow: searchable/paginated patient list, atomic clinical registration without creating a Lumora user account, demographic detail, emergency contact, read-only authorized family relationships, and navigation toward the medical record.

## Product decisions
- Staff registration creates `Persona + Direccion + Paciente + ContactoEmergencia` in one transaction.
- It does not create `Usuario`, credentials, temporary passwords, or a Lumora patient login.
- Patient email is contact data on `Persona`, not authentication identity.
- Health Staff may view family/access relationships but may not modify patient-managed relationship permissions in J09.
- Figma is the visual reference. Fields/statuses unsupported by FastAPI are removed or replaced with supported information.

## Figma mapping
- Patient List: preserve card/search/filter/bottom-nav language. Replace MRN/condition/alert filters with real demographic filters (`sexo_id`, `tipo_sangre_id`) and patient identity/contact data.
- New Patient: remove username. Add required backend fields missing from the mockup: city and emergency relationship. Keep email as optional contact data.
- Patient Detail: show identity, age/birth date, sex, blood type, phone, email, principal address, emergency contact. Do not fabricate MRN, medication, alerts, or clinical status in J09.
- Family & Access: reuse card language as read-only staff view; display related person, relationship, status, access level, notifications, and expiration when present.

## Backend contract additions
- `GET /pacientes?search=&sexo_id=&tipo_sangre_id=&limit=&offset=`: staff-authorized filtered pagination.
- `POST /pacientes/registro-clinico`: `clinica:manage`; atomic staff registration, no `Usuario`.
- `GET /pacientes/{patient_id}`: authorized patient detail including emergency contacts.
- `PATCH /pacientes/{patient_id}`: authorized write to supported demographics/patient fields.
- `GET /pacientes/{patient_id}/familiares`: authorized read-only family/access DTO.
- Emergency-contact routes require patient access; mutations require write access.
- Low-level `POST /pacientes` must no longer be public.

## Persistence
- Add nullable `personas.email` because the current Neon schema stores email only on `usuarios`, while J09 explicitly creates patients without users.
- Reflect the already-existing relationship lifecycle migration (`estado`, `nivel_acceso`, `expira_en`) in the ORM before exposing family data.
- The Neon branch must run Alembic migrations before using the new contract.

## Authorization
- Patient list, staff registration, detail, update, emergency-contact read/write, and family read use backend patient access/`clinica:manage` rules.
- Patient deletion remains an administrative action and is not exposed by J09 UI.
- Family relationship mutation is not exposed in Health Staff.

## Error behavior
- `401`: session/auth handling.
- `403/404` scoped denial: unauthorized patient data is not exposed.
- `409`: translated to a user-safe registration conflict message if returned by backend.
- `422`: field validation is mapped to form errors/general validation message without leaking raw server internals.

## Frontend architecture
`src/features/patients/` owns API types, Zod schemas, hooks, components and tests. Route files in `app/(staff)` remain thin compositions.

## Definition of Done
- Search/filter/pagination backed by FastAPI.
- Atomic patient registration without account creation.
- Detail + emergency contact backed by API.
- Family/access read-only and permission scoped.
- Navigation to medical-record route prepared without fake J10 data.
- Loading/empty/error/unauthorized and 409/422 handled.
- Frontend tests, lint, typecheck, Expo web export pass.
- Backend tests pass and migrations are explicit.
