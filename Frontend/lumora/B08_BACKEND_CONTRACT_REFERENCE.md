# B08 Backend Contract Reference

Fuente validada: backend commit `2159dd8d8a69e7720eb64deb8d91bfec4bf8e063`.

Base lógica: `/api/v1`.

## Registro
- `POST /auth/register`
- Crea Persona + Usuario + Dirección + Paciente + Contacto de emergencia + rol Paciente + verificación en una transacción.
- Requiere `username`, `email`, `password`, `phone`, `first_names`, `last_names`, `birth_date`, `sex_id`, `address`, `emergency_contact`, `accept_terms:true`, `accept_privacy:true`.
- `blood_type_id` opcional.

## Verificación de correo
- `POST /auth/verify-email` con `{ email, code }`, código de 6 dígitos.
- `POST /auth/resend-verification` con `{ email }`.
- El resend puede responder `429` por cooldown.

## Login / MFA
- `POST /auth/login` con `{ login, password }`.
- Sin MFA: `mfa_required:false` + access/refresh.
- Con MFA: `mfa_required:true` + `challenge_token` + `expires_in`; todavía no hay tokens finales.
- `POST /auth/mfa/verify` con `{ challenge_token, code }` genera tokens finales.
- `GET /auth/mfa/methods`: B08 anuncia únicamente `totp`.
- `POST /auth/mfa/setup` con `{ metodo_id }`.
- `DELETE /auth/mfa/{method_id}` desactiva una configuración MFA.
- SMS NO está implementado.

## Password
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/change-password`
- Política: 8–128, mayúscula, minúscula, número y símbolo.

## Sesiones
- `GET /auth/sessions`
- `DELETE /auth/sessions/{session_id}`
- `POST /auth/logout-others`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `POST /auth/refresh` rota refresh token.

## Errores
Dominio:

```json
{
  "error": {
    "code": "SOME_CODE",
    "message": "..."
  }
}
```

Validación: 422 estándar de FastAPI.

Estados relevantes: 400, 401, 403, 404, 409, 422, 429, 500.
