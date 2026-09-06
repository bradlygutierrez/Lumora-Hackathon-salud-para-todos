# B09 Patient context contract

All context endpoints require a Bearer access token.

* ``GET /api/v1/auth/me` returns the safe current-user DTO (roles and persona summary).
* `GET /api/v1/patients/me` resolves the authenticated patient's own `patient_id`.
* `GET /api/v1/caregivers/me/patients` returns only active, non-expired caregiver relationships. The response is `{ "items": [...] }` with patient names, relationship, status and access level.

Patients can access only their own context. Caregivers can access only relationships in `active` state with `activo=true` and no expired `expira_en`. Medical staff RBAC remains authoritative. Inaccessible contexts use the existing 404 domain error; non-caregivers calling the caregiver endpoint receive 403. No endpoint exposes password, token or MFA secrets.

The relationship lifecycle migration is `20260827_10_b09_relationship_lifecycle.py`.
