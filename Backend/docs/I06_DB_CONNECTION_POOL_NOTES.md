# I06 — Pool de conexiones PostgreSQL/Neon por réplica

## Estado real verificado (revisado antes de fijar valores, por el MVP del ticket)

- **Neon (plan Free)**: la rama `production` corre con autoscaling
  **0.25 ↔ 2 CU**. Con autoscaling activado, el límite real de
  `max_connections` que hay que respetar es el del piso mínimo (0.25 CU),
  no el del máximo — porque el compute se achica solo con poco tráfico, y
  ahí es cuando menos conexiones soporta:

  | Compute (CU) | RAM  | max_connections |
  |---|---|---|
  | 0.25 | 1 GB | **104** |
  | 2 | 8 GB | 839 |

  Fuente: [Neon — Manage computes](https://neon.com/docs/manage/computes),
  [Neon — Connection pooling](https://neon.com/docs/connect/connection-pooling).

  El backend usa la conexión **directa** a Neon (`DATABASE_URL` sin sufijo
  `-pooler`), no el pooler PgBouncer de Neon — es lo recomendado cuando la
  propia app ya gestiona su pool (nuestro caso), así que el límite que
  importa es el de `max_connections` del compute (104), no el de PgBouncer
  (10 000 conexiones de cliente, no aplica aquí).

  El proyecto Neon solo tiene **una rama** (`production`) — el `.env` local
  de desarrollo apunta al mismo servidor. Las 104 conexiones se comparten
  entre producción y cualquier conexión local/manual del equipo.

- **FastAPI Cloud (plan Hobby/free)**: verificado en el dashboard
  (Monitoring → Metrics), hoy corre **1/1 réplica**. El plan Hobby no
  incluye autoescalado horizontal real (tope de la tabla comparativa: 2
  réplicas manuales); pasar a 2+ réplicas de verdad requiere el plan Pro
  (hasta 10, configurable). Ver [FastAPI Cloud — Pricing](https://fastapicloud.com/pricing/).

- **Migraciones**: ya confirmado en `docs/I01_LOAD_BALANCER_INFRA_NOTES.md`
  que `alembic upgrade head` no corre automáticamente al arrancar cada
  réplica (ni en el Dockerfile ni en un hook de arranque) — es un paso
  manual/CI separado. No hay riesgo hoy de que dos réplicas migren a la
  vez; si se automatiza el deploy, ese paso debe seguir siendo único (antes
  de levantar réplicas nuevas), no parte del arranque de cada una.

## Fórmula de capacidad

```
conexiones_totales = réplicas × (pool_size + max_overflow) + margen_reservado
```

- `margen_reservado` (~20 conexiones): conexiones locales/manuales del
  equipo contra la misma base (Neon solo tiene una rama), corridas de
  Alembic, y las que Postgres/Neon reserva para sí mismo.

## Valores por defecto (conservadores, override por variable de entorno)

Ver `core/config.py` (`db_pool_size`, `db_max_overflow`,
`db_pool_timeout_seconds`, `db_pool_recycle_seconds`) y `.env.example`.

| Variable | Default | Qué hace |
|---|---|---|
| `DB_POOL_SIZE` | 5 | Conexiones siempre abiertas por réplica |
| `DB_MAX_OVERFLOW` | 5 | Conexiones extra bajo carga puntual (máx. por réplica: 10) |
| `DB_POOL_TIMEOUT_SECONDS` | 10 | Si no hay conexión libre en ese tiempo, falla con error claro (503) en vez de bloquear indefinidamente |
| `DB_POOL_RECYCLE_SECONDS` | 300 | Recicla conexiones cada 5 min (evita conexiones stale tras autoscaling/idle de Neon) |
| `pool_pre_ping` | `True` (fijo, no configurable) | Antes de prestar una conexión del pool, valida que siga viva |

**Con 1 réplica hoy**: 10 de 104 conexiones — margen amplio.
**Con 4 réplicas (hipotético, plan Pro)**: 40 de 104 — todavía cómodo.

## Manejo de agotamiento del pool

`sqlalchemy.exc.TimeoutError` (se lanza cuando se agotan `pool_size +
max_overflow` y pasan `pool_timeout` segundos sin liberarse ninguna) tiene
su propio exception handler en `main.py` (`pool_timeout_handler`): loguea
el evento como `"database pool exhausted"` y responde **503** con un
mensaje claro, en vez de cerrar como un 500 genérico.

## Pendiente / fuera del alcance de este ticket

- Si en algún momento se activan 2+ réplicas reales (requiere plan Pro de
  FastAPI Cloud), recalcular con el número real de réplicas usando la
  fórmula de arriba.
- Considerar una rama Neon separada para desarrollo/CI si el equipo crece,
  para no compartir presupuesto de conexiones con producción.
