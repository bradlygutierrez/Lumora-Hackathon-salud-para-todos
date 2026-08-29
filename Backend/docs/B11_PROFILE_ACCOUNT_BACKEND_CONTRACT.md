# B11 Profile and self-account contract

All routes are under /api/v1 and require a bearer access token. Self-account
routes infer identity only from the token and never accept a user ID.

## GET /account/me

Response fields:

- id, username, email, email_verified, and nullable profile_image_url.
- person: id, first_names, last_names, nullable birth_date, phone, email,
  nullable sex_id, and addresses.
- each address: id, line_1, city, nullable department, country, nullable
  postal_code, and is_primary.
- roles: objects containing id and name.

For caregivers this is always the caregiver's own Usuario and Persona, never
the patient selected through patient context. Security, session, audit, and
soft-delete fields are not exposed.

## PATCH /account/me

The only top-level fields are optional username, email, and person. The only
person fields are optional first_names, last_names, birth_date, phone, and
sex_id. Extra fields are rejected with 422. This includes IDs, password,
activo, roles, permissions, email verification, MFA, sessions, patient
relations, and clinical fields.

Username and email are trimmed and lowercased. Duplicate username or email
returns 409. Invalid email, username, date, length, shape, sex reference, image
input, extra fields, or an unknown sex catalog ID returns 422. Password changes
remain at POST /auth/change-password.

## Profile image

- POST /account/me/profile-image accepts multipart field file, JPEG, PNG, or
  WebP only, up to 5 MiB. It returns profile_image_url.
- DELETE /account/me/profile-image clears the image and returns a null
  profile_image_url.

The development adapter stores unique names in PROFILE_IMAGE_DIR, defaulting
to storage/profile-images, and serves PROFILE_IMAGE_BASE_URL, defaulting to
/media/profile-images. Original filenames are ignored. This local filesystem
is not production-durable. Production must supply a durable object-storage
adapter and public URL configuration; no provider or cloud credentials are
bundled. Tests use in-memory storage without network access.

## Patient-scoped B11 data

Account routes describe the authenticated user only. Patient health data stays
on these existing routes:

- GET /pacientes/{patient_id}
- /pacientes/{patient_id}/contactos-emergencia GET, POST, PATCH, and DELETE
- GET /health-indicators/patients/{patient_id}/measurements

These reuse B09 patient authorization. Patients access their own context;
caregivers need an active authorized relationship and write access for
mutations. No height field is invented.

Generic /usuarios routes are administrative and require the existing
usuarios:editar permission. Patient and Caregiver roles cannot enumerate,
read, edit, or delete users through them.
