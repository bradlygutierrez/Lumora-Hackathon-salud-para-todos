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

PROFILE_IMAGE_STORAGE_PROVIDER selects the adapter, defaulting to "local"
for development: it stores unique names in PROFILE_IMAGE_DIR (default
storage/profile-images) and serves them under PROFILE_IMAGE_BASE_URL
(default /media/profile-images). This filesystem is per-replica and is
lost on redeploys/restarts -- it is not production-durable (I04).

Setting it to "r2" or "b2" switches to Cloudflare R2 / Backblaze B2
through the same S3-compatible API (S3CompatibleProfileImageStorage in
profile_image_storage.py), so an image uploaded through any replica is
immediately servable from every other replica and survives redeploys.
"r2" requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
R2_BUCKET_NAME, and R2_PUBLIC_BASE_URL; "b2" requires B2_KEY_ID,
B2_APPLICATION_KEY, B2_BUCKET_NAME, B2_REGION, and B2_PUBLIC_BASE_URL --
Settings fails fast at startup if any of the selected provider's
variables is missing. No provider credentials are bundled in the repo;
they are supplied only per-environment/secret manager. In "r2"/"b2" mode
the local StaticFiles mount is skipped entirely.

*_PUBLIC_BASE_URL has two valid shapes, and both work with the exact
same adapter code. If the bucket is public (a custom domain, or the
provider's own public dev URL), point it directly at the provider --
images are served straight from there, never touching this backend. If
the bucket is private (e.g. Backblaze B2 without adding a credit card:
making a B2 bucket public requires either payment history on file or a
one-time verification fee, which a project may reasonably want to
avoid), point it at this backend's own origin instead
(https://<host>/media/profile-images) -- api/media.py mounts a router
under that exact path (only when the provider isn't "local") that
downloads the object using the backend's own private credentials via
ProfileImageStorage.read() and streams it back, so the bucket itself
never needs public access. Deciding which shape to use is purely a
config choice (what URL ops puts in *_PUBLIC_BASE_URL); no code branches
on it.

In all modes, filenames are generated server-side (token_urlsafe); the
original uploaded filename is never used as or derived into a path.
Deleting or replacing an image removes the old object from storage so no
stale reference is left behind (see AccountService.set_image/delete_image).

Tests use in-memory/fake storage without network access -- the existing
MemoryImageStorage fake at the AccountService/route level, a FakeS3Client
fake for the S3-compatible adapter's own contract tests (save/delete/
read), and route-level tests for GET /media/profile-images/{filename}
(found, not-found, and path-traversal-style filenames) with a fake
storage swapped in via dependency override.

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
