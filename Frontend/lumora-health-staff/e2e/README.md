# E2E web — Lumora Health Staff

Los E2E usan Cypress de forma transitoria con `npx`; Cypress no se agrega al
`package-lock.json` ni queda como dependencia del proyecto.

## Smoke público

No necesita credenciales y es el que corre en GitHub Actions:

```bash
npm run e2e:web:smoke
```

Valida que el login real renderice, que no exista `Previsualizar pantallas`,
que no exista un bypass manual de MFA y que `/mfa-challenge` no sea accesible
sin un challenge real.

## Flujo clínico autenticado

1. Copiar `.env.e2e.example` a `.env.e2e.local`.
2. Usar únicamente una cuenta QA con datos sintéticos.
3. Completar `LUMORA_E2E_LOGIN` y `LUMORA_E2E_PASSWORD`.
4. Si la cuenta usa TOTP, completar `LUMORA_E2E_TOTP_SECRET`.
5. Para Email OTP o un código manual temporal, usar `LUMORA_E2E_MFA_CODE`.
6. Ejecutar:

```bash
npm run e2e:web:clinical
```

El flujo es de **solo lectura**: login/MFA, Panel, Pacientes, Detalle,
Expediente, Timeline, Condiciones, Agenda, Personal y Centro de Seguridad.
No crea, edita, borra ni revoca información.

## Privacidad

- `.env.e2e.local` ya coincide con `.env*.local` y Git lo ignora.
- No se generan videos ni screenshots de Cypress.
- Las tareas que leen password/MFA se ejecutan con logging desactivado.
- No uses pacientes reales para E2E.
