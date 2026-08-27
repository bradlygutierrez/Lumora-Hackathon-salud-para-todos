# Lumora Health Staff

Aplicacion Expo/React Native para personal clinico autorizado de Lumora.

## Variables de entorno

```env
EXPO_PUBLIC_API_URL=https://backend-3d83d7df.fastapicloud.dev
EXPO_PUBLIC_APP_ENV=development
```

`EXPO_PUBLIC_API_URL` puede definirse con o sin `/api/v1`; la app normaliza el prefijo internamente.

## Scripts

```bash
npm install
npm run lint
npm run typecheck
npm test
npx expo start
```

## J08 - Auth, MFA y perfil del staff

Contratos FastAPI usados:

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `GET /auth/sessions`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/verify-email`
- `GET /auth/mfa/methods`
- `POST /auth/mfa/challenge`
- `POST /auth/mfa/verify`
- `POST /auth/mfa/recovery`
- `DELETE /auth/mfa/{method_id}`
- `GET /usuarios/{user_id}`
- `GET /profesionales`
- `GET /profesionales/{professional_id}`

Mismatches backend/frontend detectados:

- No existe `GET /auth/me`; el frontend obtiene `sub` del JWT y consulta `GET /usuarios/{user_id}` para resolver roles y permisos.
- No existe revocacion individual de sesiones; el frontend solo puede listar sesiones y cerrar todas con `POST /auth/logout-all`.
- `GET /profesionales` y `GET /profesionales/{id}` no declaran dependencia de autenticacion ni permisos en el router actual. El frontend aplica guards de UX con permisos cargados, pero FastAPI sigue siendo la fuente de seguridad.
- No existe endpoint para obtener el profesional asociado al usuario autenticado; el frontend cruza `persona.id` contra el directorio para mostrar "Mi perfil".
