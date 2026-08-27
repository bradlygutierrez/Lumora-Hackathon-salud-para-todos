# B08 Auth Frontend Design

## Goal
Implementar la autenticación completa de Lumora para Paciente/Cuidador sobre el backend B08 ya publicado, sin alterar la arquitectura B07 ni adelantar las pantallas clínicas de otras cards.

## Source of truth
Backend commit `2159dd8d8a69e7720eb64deb8d91bfec4bf8e063` y `Backend/docs/B08_AUTH_BACKEND_CONTRACT.md`.

## Architecture
- Expo Router: solo rutas/layouts en `src/app`.
- Feature Auth: tipos, schemas, API, hooks, stores y componentes en `src/features/auth`.
- Servicios/infraestructura usan clases cuando encapsulan responsabilidad (`AuthApiService`).
- React components/hooks siguen estilo funcional.
- `SecureStore` persiste únicamente access/refresh tokens finales.
- Zustand conserva estado global pequeño: sesión, challenge MFA temporal y wizard de registro.
- TanStack Query maneja requests/mutations y caché de sesiones/catálogos.
- React Hook Form + Zod manejan formularios y validación cliente.

## Registration
Cuatro pasos locales. Ningún paso intermedio crea entidades en backend. Paso 4 construye un `PatientRegistrationRequest` y ejecuta un solo `POST /auth/register` transaccional.

Correcciones frente a Figma:
- Paso 2 incluye Nombres y Apellidos porque backend los exige.
- `sex_id` es obligatorio aunque el diseño lo presentaba como opcional.
- `blood_type_id` sí es opcional.
- Relación de contacto se envía como texto porque el DTO backend usa `relationship`.

## Email verification
Código numérico de 6 dígitos con `POST /auth/verify-email {email, code}` y resend con cooldown 429.

## Login and MFA
`POST /auth/login` discrimina por `mfa_required`.
- `false`: guardar tokens y entrar a app.
- `true`: guardar challenge solo en memoria y abrir `/(auth)/mfa`.
- No SMS. Solo TOTP/Authenticator.

## Password flows
Forgot-password es genérico para no filtrar existencia de cuentas. Reset usa token de enlace/deep link. Change-password autenticado conserva sesión actual y backend revoca las demás.

## Security center
Rutas autenticadas para contraseña, TOTP y sesiones. Se puede revocar una sesión remota, cerrar otras, cerrar actual o cerrar todas.

## Error handling
Se reutiliza `ApiError`; se agrega HTTP 429 como `RATE_LIMITED`. Mensajes de dominio del backend se muestran al usuario sin recrear reglas de negocio en cada pantalla.

## Non-goals
- No SMS MFA.
- No perfil B11 completo.
- No pantallas clínicas.
- No cambios al backend.
- No QR generado para TOTP; se muestra clave/provisioning data y recovery codes usando capacidades existentes. Puede añadirse QR después sin cambiar el contrato.
