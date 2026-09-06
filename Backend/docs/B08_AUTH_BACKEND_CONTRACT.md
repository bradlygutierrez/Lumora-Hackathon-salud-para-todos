# Contrato backend de autenticación B08

Base URL: `/api/v1`. Los errores de dominio usan `{"error":{"code":"...","message":"..."}}`; la validación usa el 422 estándar de FastAPI. Ninguna respuesta expone hashes o secretos internos.

## Registro público

`POST /auth/register` crea Persona, Usuario, Dirección principal, Paciente, Contacto de emergencia, rol Paciente y código de verificación en una sola transacción. Requiere `username`, `email`, `password`, `phone`, `first_names`, `last_names`, `birth_date`, `sex_id`, `address`, `emergency_contact`, `accept_terms:true` y `accept_privacy:true`; `blood_type_id` es opcional. Responde 201 con IDs, `email_verified:false` y estado, nunca con contraseña o código. Duplicados: 409; catálogos inexistentes: 404; payload inválido: 422.

`POST /auth/register/caregiver` crea Persona, Usuario, Dirección principal, rol Cuidador y código de verificación; no crea Paciente ni Contacto de emergencia. Ambos registros reutilizan `/auth/verify-email` y `/auth/resend-verification`.

`GET /auth/me` puede devolver uno o varios roles. `GET /patients/me` requiere un perfil Paciente. `GET /caregivers/me/patients` devuelve únicamente pacientes con una RelacionPaciente activa, vigente y autorizada; una cuenta cuidadora sin relaciones recibe una lista vacía. El rol Cuidador habilita el modo cuidador, pero no concede acceso global ni reemplaza la autorización por relación.

## Verificación de correo

`POST /auth/verify-email` acepta `{"email":"...","code":"123456"}`. Por compatibilidad también acepta `{"token":"..."}`. Los códigos expiran, se almacenan como hash y son de un solo uso. `POST /auth/resend-verification` recibe email, responde genéricamente, reemplaza códigos activos y puede responder 429 durante el cooldown.

Gmail SMTP usa TLS (`smtp.gmail.com:587`) y los secretos `SMTP_USERNAME`, `SMTP_APP_PASSWORD` y `EMAIL_FROM`. La contraseña debe ser una contraseña de aplicación de Google; nunca se versiona.

## Login y MFA

`POST /auth/login` recibe `login` y `password`. Sin MFA responde `mfa_required:false` con access/refresh tokens. Con TOTP responde `mfa_required:true`, `challenge_token` y `expires_in`, sin tokens finales. `POST /auth/mfa/verify` recibe challenge y código TOTP y devuelve el par de tokens al consumir el desafío. Los desafíos expiran, son de un uso y limitan intentos. B08 solo anuncia TOTP/Authenticator App; SMS no está implementado.

Se conservan `/auth/token`, `/auth/mfa/challenge`, setup, recovery y disable para clientes existentes. `GET /auth/mfa/methods` anuncia `totp` incluso antes de configurarlo (`activo:false`); nunca anuncia SMS.

## Contraseñas

`POST /auth/forgot-password` recibe email y siempre responde genéricamente. Los tokens se almacenan como hash, expiran y son de un uso. `POST /auth/reset-password` recibe token y contraseña nueva; revoca todas las sesiones. `POST /auth/change-password` requiere bearer de sesión, contraseña actual y nueva; conserva la sesión actual y revoca las demás. Registro, reset y cambio comparten la política: 8–128 caracteres con mayúscula, minúscula, número y símbolo.

## Sesiones y refresh

`GET /auth/sessions` requiere bearer y lista únicamente sesiones propias activas con ID, IP, user-agent, dispositivo/plataforma derivados, fechas e `is_current`. `DELETE /auth/sessions/{session_id}` revoca una sesión propia de forma idempotente; una ajena responde 404. `POST /auth/logout-others` conserva la actual. `/auth/logout` revoca la actual y `/auth/logout-all` revoca todas, incluida la actual.

`POST /auth/refresh` recibe `refresh_token`, rota el token bajo bloqueo de fila y devuelve un nuevo par. El token anterior, uno expirado o uno revocado deja de funcionar inmediatamente.

## Estados relevantes

- 400: token/código inválido o regla de dominio.
- 401: credenciales, bearer o sesión inválidos.
- 403: permiso insuficiente o MFA requerido en el endpoint OAuth2 heredado.
- 404: recurso propio inexistente.
- 409: username/email duplicado o conflicto.
- 422: validación Pydantic.
- 429: reenvío demasiado frecuente.
- 500: error inesperado con mensaje genérico.

### MFA B08 actualizado

Los únicos métodos soportados son `email` (Email OTP) y `totp` (Authenticator App); SMS no está implementado. `POST /auth/mfa/setup` nunca activa un método: para TOTP devuelve `method_id`, `secret` y `provisioning_uri`; para email envía un OTP de 6 dígitos y devuelve `challenge_token`/`expires_in`. Confirmar con `POST /auth/mfa/setup/confirm` usando `method_id` y `code`; solo entonces se activa el método y se muestran recovery codes una única vez.

El login indica `method` junto con `mfa_required:true`. Email OTP y TOTP usan el mismo `POST /auth/mfa/verify`; los OTP se almacenan como hashes, expiran, limitan intentos y se consumen tras uso. Deshabilitar un método consume sus challenges y elimina sus recovery codes.
