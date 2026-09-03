# I01 — Balanceador de carga + health checks

Esta tarjeta es mixta: parte de código (en este repo) y parte de configuración
del hosting (FastAPI Cloud), que no se puede hacer desde el repositorio.

## Hecho en código

- `GET /healthz` (sin autenticación, fuera del schema público): confirma que
  la réplica puede hablar con PostgreSQL/Neon (`SELECT 1`). Devuelve `200
  {"status": "ok"}` o `503 {"status": "unavailable"}`. Es el endpoint que debe
  apuntar el health check del balanceador.
- El backend ya es stateless: autenticación por JWT (sin cookies de sesión),
  sesiones/MFA/tokens de recuperación viven en PostgreSQL, no hay caches ni
  colecciones mutables en memoria de proceso compartidas entre peticiones
  (solo `lru_cache` sobre fábricas de configuración/cliente, que no
  almacenan estado de negocio). La única dependencia de filesystem local es
  el modo `profile_image_storage_provider=local`, ya documentado en
  `core/config.py` como solo para desarrollo -- en producción usar `r2`/`b2`.
- CORS ya cubre las apps oficiales y el portal interno (`CORS_ORIGINS`,
  ver `.env.example`).
- `X-Forwarded-For` se lee para IP de cliente en los logs de I05
  (`api/middleware.py`), pero sin validar todavía qué proxy es confiable
  (ver pendientes).
- No hay ningún paso que corra `alembic upgrade head` dentro del proceso de
  la app (ni en el `Dockerfile`, ni en un hook de arranque) -- las
  migraciones son un paso de despliegue separado y manual/CI, por lo que hoy
  no hay riesgo de que dos réplicas las corran a la vez. Si en algún momento
  se automatiza el despliegue, ese paso debe ejecutarse una sola vez (antes
  de levantar réplicas nuevas), no como parte del arranque de cada una.

## Pendiente de configuración en FastAPI Cloud (dashboard, no código)

- Activar 2+ réplicas del backend (si el plan lo permite) y apuntar el
  health check del balanceador a `GET /healthz`.
- Confirmar TLS/HTTPS y health checks automáticos -- FastAPI Cloud es una
  plataforma administrada, es probable que ya lo resuelva por defecto, pero
  hay que confirmarlo en el dashboard.
- Confirmar que el balanceador no usa sticky sessions (no hace falta: JWT
  bearer, no hay estado de sesión pegado a una réplica).
- Timeouts y límites de la plataforma (los del pool de conexiones a
  Neon/PostgreSQL son responsabilidad de I06, no de esta tarjeta).
- Validar/echar un vistazo a qué IP de origen usa el proxy de FastAPI Cloud
  para decidir si conviene restringir qué remitentes de `X-Forwarded-For`
  se consideran confiables (hoy se toma el primer valor del header tal cual
  llega, sin esa validación).
- Smoke manual una vez haya 2+ réplicas activas: repartir tráfico, tirar una
  réplica y confirmar que el servicio sigue respondiendo.
