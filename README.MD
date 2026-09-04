<p align="center"><img src="Frontend/lumora-website/lumora-website/public/favicon.svg" width="110" alt="Logo de Lumora"></p>

<h1 align="center">Lumora</h1>

<p align="center"><strong>Plataforma integral para pacientes, cuidadores y profesionales de salud.</strong><br>README técnico para instalación, desarrollo, pruebas, seguridad y despliegue.</p>

Contenido







Descripción

Componentes

Arquitectura

Tecnologías

Estructura del repositorio

Requisitos previos

Inicio rápido

Variables de entorno

Base de datos y Neon

Almacenamiento de imágenes

API y módulos principales

Pruebas y validaciones

Flujo de desarrollo

Despliegue

Seguridad y buenas prácticas

Integración continua

Solución de problemas

Estado técnico vigente

Referencias





Descripción

Lumora es una solución digital de salud compuesta por una API central y tres clientes. La plataforma permite gestionar autenticación y MFA, perfiles, pacientes y cuidadores, citas, expedientes, consultas, diagnósticos, condiciones médicas, recetas, indicadores, alertas, recordatorios, notificaciones, roles, permisos, afiliaciones médicas y administración de clientes API.

El backend se ejecuta con FastAPI y PostgreSQL/Neon. Las aplicaciones móviles y web consumen la misma API, mientras que las imágenes de perfil pueden almacenarse de forma durable en Backblaze B2 o Cloudflare R2 mediante una interfaz compatible con S3.

Componentes

Componente

Ubicación

Finalidad

API

Backend/

Reglas de negocio, seguridad, persistencia, media y API REST

Lumora

Frontend/lumora/

Aplicación Expo para pacientes y cuidadores

Lumora Health Staff

Frontend/lumora-health-staff/

Aplicación Expo para profesionales de salud

Portal institucional

Frontend/lumora-website/lumora-website/

Portal Vite para afiliaciones, administración y soporte

Infraestructura remota

FastAPI Cloud + Neon + B2/R2

Backend desplegado, PostgreSQL administrado y almacenamiento durable

Arquitectura

El backend mantiene la separación Routers → Services → Repositories → Database. Los modelos SQLAlchemy están separados de los esquemas Pydantic que definen los contratos HTTP.

La API principal se publica bajo /api/v1. El backend está diseñado para ser stateless entre réplicas: la autenticación utiliza JWT y el estado persistente de sesiones, MFA, recuperación y datos clínicos vive en PostgreSQL.

Escalado del backend y pool de conexiones

<p align="center"><img src="./Backend/docs/arquitectura-pool-neon.png" alt="Arquitectura Lumora" width="900"></p>

<p align="center"><em>Arquitectura de Lumora con clientes, balanceador, réplicas en FastAPI Cloud, PostgreSQL Neon y almacenamiento de imágenes en B2/R2.</em></p>

Cada réplica de FastAPI administra su propio pool de SQLAlchemy. Por eso, el presupuesto total de conexiones debe calcularse considerando todas las réplicas y dejando capacidad reservada para migraciones, administración y tareas operativas.

Regla de capacidad: N × (pool_size + max_overflow) ≤ presupuesto de Neon - margen reservado.

Puntos importantes:

pool_pre_ping=True permite validar una conexión antes de reutilizarla.

pool_size, max_overflow, pool_timeout y pool_recycle deben dimensionarse según los límites reales de Neon y el número de réplicas.

Los valores deben poder configurarse por variables de entorno.

El agotamiento del pool debe producir errores y logs claros, no esperas indefinidas.

Alembic debe ejecutarse una sola vez por despliegue, no desde cada réplica.

El endpoint /healthz sirve como readiness check para el balanceador y comprueba conectividad con PostgreSQL mediante una operación ligera.

Media e imágenes de perfil

El almacenamiento de imágenes está abstraído detrás de ProfileImageStorage:

local: filesystem para desarrollo.

b2: Backblaze B2 mediante API S3-compatible.

r2: Cloudflare R2 mediante API S3-compatible.

Cuando el bucket es privado, el backend puede servir la imagen mediante /media/profile-images/{filename} sin exponer las credenciales del proveedor al cliente.

Tecnologías

Backend

Tecnología

Uso

Python 3.14

Runtime

FastAPI 0.141+

API REST, validación y OpenAPI

Pydantic / Pydantic Settings

Esquemas y configuración tipada

SQLAlchemy 2

ORM y sesiones asíncronas

Alembic

Migraciones

PostgreSQL / Neon

Base de datos relacional

asyncpg

Driver asíncrono de PostgreSQL

boto3

Acceso S3-compatible a B2/R2

PyJWT

Access tokens y sesiones

pwdlib + Argon2

Hash de contraseñas

PyOTP + cryptography

MFA TOTP y protección de secretos

ReportLab

PDFs clínicos

pytest

Pruebas automatizadas

Docker

Imagen reproducible del backend

Lumora - paciente y cuidador

Tecnología

Uso

Expo SDK 57

Plataforma

React Native 0.86 / React 19

UI multiplataforma

TypeScript 6

Tipado

Expo Router

Navegación

TanStack React Query

Caché y estado remoto

Axios

HTTP

React Hook Form + Zod

Formularios y validación

Zustand

Estado local compartido

NativeWind

Estilos

Jest + Testing Library

Pruebas

Lumora Health Staff

Tecnología

Uso

Expo SDK 54

Plataforma

React Native 0.81 / React 19

UI multiplataforma

TypeScript 5.9

Tipado

Expo Router

Navegación

TanStack React Query

Estado remoto

Axios

HTTP

React Hook Form + Zod

Formularios y validación

Jest + Testing Library

Pruebas

Portal institucional

Tecnología

Uso

Vite 8

Desarrollo y build

TypeScript 6

Lógica tipada

Toastify

Notificaciones de interfaz

Node Test Runner

Pruebas del portal

Estructura del repositorio

Ruta

Contenido

Backend/src/lumora_api/api/

Routers, dependencias, middleware y media

Backend/src/lumora_api/core/

Configuración, seguridad, logging y excepciones

Backend/src/lumora_api/db/

Engine, sesiones y seeds

Backend/src/lumora_api/models/

Modelos ORM

Backend/src/lumora_api/repositories/

Acceso a datos

Backend/src/lumora_api/schemas/

Contratos Pydantic

Backend/src/lumora_api/services/

Reglas de negocio

Backend/migrations/

Migraciones Alembic

Backend/tests/

Pruebas backend

Backend/docs/

Notas y contratos técnicos

Frontend/lumora/

App de pacientes y cuidadores

Frontend/lumora-health-staff/

App de profesionales

Frontend/lumora-website/lumora-website/

Portal institucional

.github/workflows/

Integración continua

Requisitos previos

Instale antes de comenzar:

Git.

Python 3.14.

uv para dependencias y ejecución del backend.

Node.js 22 LTS y npm.

PostgreSQL local o una base Neon remota.

Docker si se utilizará el flujo contenerizado.

Cuenta Expo/EAS si se generarán builds o despliegues Expo.

Puede comprobar las herramientas con git --version, python --version, uv --version, node --version, npm --version y docker --version.

Inicio rápido

1. Clonar el repositorio

Ejecute git clone https://github.com/bradlygutierrez/Lumora-Hackathon-salud-para-todos.git, entre al repositorio y cambie a develop con git switch develop.

2. Backend

Desde Backend/:

Copie .env.example a .env.

Configure como mínimo DATABASE_URL y JWT_SECRET.

Ejecute uv sync --frozen.

Aplique migraciones con uv run alembic upgrade head.

Cargue datos base con uv run python -m lumora_api.db.seed.

Inicie el servidor con uv run fastapi dev.

Servicios locales:

API: http://127.0.0.1:8000/api/v1

Swagger: http://127.0.0.1:8000/docs

OpenAPI: http://127.0.0.1:8000/openapi.json

3. Lumora - paciente y cuidador

Desde Frontend/lumora/, copie .env.example a .env, ejecute npm ci y luego npm start.

También puede usar npm run android, npm run ios o npm run web.

En un teléfono físico, localhost apunta al propio teléfono. Use una URL HTTPS accesible o la IP LAN de la computadora en EXPO_PUBLIC_API_URL.

4. Lumora Health Staff

Desde Frontend/lumora-health-staff/, copie .env.example a .env, ejecute npm ci y luego npm start.

5. Portal institucional

Desde Frontend/lumora-website/lumora-website/, copie .env.example a .env, ejecute npm ci y luego npm run dev.

VITE_API_URL debe contener el origen del backend. El portal agrega /api/v1 cuando construye las llamadas de API.

Variables de entorno

Nunca suba archivos .env con secretos. Use .env.example como contrato de configuración.

Backend

Variable

Uso

ENVIRONMENT

development, test o production

DATABASE_URL

URL PostgreSQL/Neon con TLS en producción

JWT_SECRET

Secreto de firma; mínimo 32 caracteres en producción

API_V1_PREFIX

Prefijo de la API, normalmente /api/v1

ACCESS_TOKEN_MINUTES

Vida del access token

REFRESH_TOKEN_DAYS

Límite absoluto de sesión renovable

SESSION_IDLE_MINUTES

Expiración por inactividad

CORS_ORIGINS

Lista de orígenes web autorizados

SMTP_* / EMAIL_FROM

Envío de correo

MFA_*

Configuración de segundo factor

PROFILE_IMAGE_STORAGE_PROVIDER

local, b2 o r2

B2_KEY_ID

ID de clave Backblaze B2

B2_APPLICATION_KEY

Secreto Backblaze B2

B2_BUCKET_NAME

Bucket B2

B2_REGION

Región B2

B2_PUBLIC_BASE_URL

Base pública o URL proxy del backend

R2_ACCOUNT_ID

Cuenta Cloudflare R2

R2_ACCESS_KEY_ID

Access key R2

R2_SECRET_ACCESS_KEY

Secret R2

R2_BUCKET_NAME

Bucket R2

R2_PUBLIC_BASE_URL

Base pública del bucket

API_MASTER_KEY

Clave maestra opcional para identificar un cliente API

Las credenciales B2/R2, JWT_SECRET, DATABASE_URL, claves SMTP y API_MASTER_KEY deben vivir únicamente en variables de entorno o en el secret manager del proveedor.

Clientes

Cliente

Variables públicas principales

Lumora

EXPO_PUBLIC_API_URL

Health Staff

EXPO_PUBLIC_API_URL, EXPO_PUBLIC_APP_ENV, EXPO_PUBLIC_ENABLE_UI_PREVIEW

Portal Vite

VITE_API_URL

Las variables EXPO_PUBLIC_* y VITE_* quedan incorporadas en el cliente. Nunca coloque secretos en ellas.

Base de datos y Neon

Conexión

La configuración acepta URLs postgres:// y postgresql:// y las normaliza al dialecto asíncrono postgresql+asyncpg://. También adapta parámetros comunes de Neon para que sean compatibles con asyncpg.

El engine mantiene pool_pre_ping=True para comprobar que las conexiones reutilizadas siguen activas.

Política de pool

La política de pool debe definirse a partir de:

El límite real de conexiones del proyecto Neon.

El número máximo de réplicas del backend.

El tráfico concurrente esperado.

El margen reservado para Alembic, administración y tareas operativas.

Los parámetros relevantes son pool_size, max_overflow, pool_timeout y pool_recycle. Deben ser configurables por ambiente y probarse bajo concurrencia, reinicios y desconexiones transitorias.

Migraciones

Desde Backend/ use uv run alembic heads, uv run alembic current y uv run alembic history para revisar el estado.

Para aplicar el esquema use uv run alembic upgrade head. Para crear una revisión durante desarrollo use uv run alembic revision --autogenerate -m "descripcion" y revise manualmente el archivo generado antes de confirmarlo.

En producción, las migraciones se ejecutan una sola vez como paso controlado del despliegue.

Almacenamiento de imágenes

El filesystem local es útil durante desarrollo, pero no es durable cuando existen varias réplicas o redeploys. Lumora utiliza una abstracción de almacenamiento para evitar depender del disco de una instancia.

Backblaze B2 y Cloudflare R2

Ambos proveedores se consumen mediante una interfaz S3-compatible con boto3.

Las operaciones bloqueantes de boto3 se ejecutan fuera del event loop.

Los nombres de archivo se generan en el backend y no dependen del nombre original del usuario.

JPEG, PNG y WebP conservan su Content-Type.

Las credenciales nunca se envían al frontend.

Bucket privado

Si el bucket no es público, B2_PUBLIC_BASE_URL puede apuntar al backend. La aplicación solicita la imagen a /media/profile-images/{filename} y FastAPI la obtiene de B2 con credenciales privadas.

API y módulos principales

La API se agrupa bajo /api/v1. Entre los módulos principales se encuentran:

Área

Funcionalidad

Autenticación

Login, refresh, logout, recuperación y verificación

MFA

TOTP, desafíos y códigos de recuperación

Cuenta

Perfil propio y fotografía

Usuarios

Gestión de usuarios y administración

Pacientes y cuidadores

Perfiles, relaciones y contextos autorizados

Profesionales

Perfil profesional, licencia y directorio

Agenda y citas

Citas, disponibilidad y espacio profesional

Expediente

Resumen clínico, timeline y documentos

Consultas

Signos vitales, notas y atención clínica

Diagnósticos y condiciones

Registro e historial clínico

Recetas

Medicamentos, recetas y horarios de dosis

Indicadores

Mediciones, rangos y unidades

Alertas

Alertas clínicas y atención

Recordatorios y notificaciones

Seguimiento y comunicación

RBAC

Roles, permisos y asignaciones

Afiliaciones

Flujos institucionales y profesionales

Clientes API

Identificación mediante X-API-Key y rotación de claves

Endpoints operativos fuera del prefijo principal:

/healthz: readiness check para el balanceador.

/media/profile-images/{filename}: proxy de media cuando el almacenamiento remoto lo requiere.

La referencia contractual completa está disponible en /docs y /openapi.json cuando el backend está en ejecución.

Pruebas y validaciones

Backend

Desde Backend/ ejecute uv sync --frozen y uv run pytest. Para una salida compacta use uv run pytest -q.

Lumora

Desde Frontend/lumora/ ejecute, en este orden: npm ci, npm run lint, npm run typecheck, npm test -- --runInBand y npx expo export --platform web con EXPO_PUBLIC_API_URL configurada.

Health Staff

Desde Frontend/lumora-health-staff/ ejecute: npm ci, npm run lint, npm run typecheck, npm test -- --runInBand y npx expo export --platform web.

El proyecto también dispone de npm run e2e:web:smoke y npm run e2e:web:clinical. El E2E clínico debe usar únicamente cuentas sintéticas de QA.

Portal institucional

Desde Frontend/lumora-website/lumora-website/ ejecute npm ci, npm test y npm run build. Use npm run preview para revisar localmente el artefacto final.

Flujo de desarrollo

Actualice develop con git pull --ff-only.

Lea el AGENTS.md aplicable antes de modificar código.

Cree una rama corta: feat/..., fix/..., test/..., docs/..., chore/... o style/....

Mantenga las responsabilidades por capas y no invente contratos desde el frontend.

Añada o actualice pruebas junto con el cambio.

Ejecute las validaciones del componente afectado.

Use Conventional Commits con mensaje y cuerpo descriptivos.

Abra Pull Request hacia develop.

Promueva a main mediante Pull Request cuando la versión esté lista para producción.

Despliegue

Checklist previo

Antes de desplegar:

Confirme la rama y versión que se publicará.

Ejecute pruebas y builds del componente.

Configure secretos únicamente en el proveedor.

Use ENVIRONMENT=production.

Configure PostgreSQL con TLS.

Restrinja CORS_ORIGINS a los dominios reales.

Configure almacenamiento B2/R2 si las imágenes deben ser durables.

Ejecute migraciones una sola vez.

Mantenga un procedimiento de reversión.

Backend - FastAPI Cloud

Desde Backend/, valide con uv sync --frozen y uv run pytest; el despliegue se inicia con uv run fastapi deploy.

Después configure las variables del entorno de producción en FastAPI Cloud. El balanceador debe consultar /healthz como readiness check.

Las migraciones y el seed se ejecutan como un paso controlado: uv run alembic upgrade head y, cuando corresponda, uv run python -m lumora_api.db.seed.

Backend - Docker

Construya la imagen con docker build -t lumora-api .. Las migraciones, seed y ejecución del servidor deben realizarse como pasos separados para evitar que varias réplicas modifiquen el esquema simultáneamente.

Portal institucional - Netlify

Configuración recomendada:

Campo

Valor

Base directory

Frontend/lumora-website/lumora-website

Build command

npm run build

Publish directory

dist

Variable

VITE_API_URL=https://BACKEND_URL

Después agregue el dominio definitivo de Netlify a CORS_ORIGINS del backend.

Apps Expo

Configure EXPO_PUBLIC_API_URL con la URL HTTPS del backend antes de exportar o construir. La app principal ya tiene un proyecto EAS asociado; cualquier aplicación que no lo tenga debe vincularse antes del primer despliegue.

Seguridad y buenas prácticas

Lumora aplica controles de seguridad en el backend y los clientes:

Validación mediante Pydantic y Zod.

Hash de contraseñas con Argon2.

JWT de corta duración y refresh tokens asociados a sesiones persistentes.

Revocación de sesiones y expiración por inactividad.

MFA TOTP y códigos de recuperación.

RBAC con roles y permisos.

Controles de relación profesional-paciente para información clínica.

Identificación de aplicaciones consumidoras mediante X-API-Key.

Request IDs y logging estructurado.

CORS restringido por origen.

HTTPS y TLS hacia PostgreSQL en producción.

Secretos fuera de Git.

No registre contraseñas, tokens, secretos MFA, API keys ni información clínica sensible en logs.

Integración continua

Los workflows existentes incluyen validaciones para backend y Health Staff.

Workflow

Validaciones principales

Backend

Python 3.14, uv sync --frozen, pytest

Health Staff

npm ci, lint, typecheck, Jest, export web y smoke E2E público

La cobertura de CI debe revisarse cuando se incorporen cambios relevantes en Lumora paciente/cuidador o en el portal institucional.

Solución de problemas

EXPO_PUBLIC_API_URL is required

Defina EXPO_PUBLIC_API_URL en .env o como variable del proceso antes de iniciar/exportar Expo.

El teléfono no accede al backend local

No utilice 127.0.0.1 desde un dispositivo físico. Use la IP LAN de la computadora o una URL HTTPS accesible y confirme que el firewall permita el puerto requerido.

Error CORS

Agregue el origen exacto del frontend a CORS_ORIGINS. Esquema, dominio y puerto deben coincidir. Reinicie o redeploye el backend después del cambio.

Problemas de conexión con Neon

Compruebe la URL, TLS y conectividad. pool_pre_ping=True ayuda a descartar conexiones muertas. Si el problema es agotamiento de pool, revise pool_size, max_overflow, pool_timeout, número de réplicas y presupuesto real de conexiones.

Alembic no encuentra la revisión correcta

Revise uv run alembic heads, uv run alembic current y uv run alembic history. Resuelva bifurcaciones antes de producción y despliegue con upgrade head.

Jest termina pero el proceso queda abierto

Use temporalmente npm test -- --runInBand --detectOpenHandles para localizar recursos no liberados. Corrija timers, listeners o handles en lugar de normalizar --forceExit.

Estado técnico vigente

La solución incluye actualmente:

Almacenamiento durable S3-compatible para imágenes de perfil con Backblaze B2 o Cloudflare R2.

Proxy /media/profile-images para buckets privados.

Readiness /healthz para el balanceador.

Request IDs y logging estructurado.

Identificación de clientes API mediante X-API-Key, claves rotables y clave maestra opcional.

Expiración de sesiones por inactividad.

Autorización clínica basada en relación profesional-paciente.

Lumora paciente/cuidador sobre Expo SDK 57.

Health Staff con flujos clínicos, perfil, notificaciones y agenda.

Portal institucional Vite preparado para build y despliegue estático.

La configuración efectiva del número de réplicas y del presupuesto de conexiones a Neon debe mantenerse coordinada con la política del balanceador y el pool de SQLAlchemy.

Referencias

Repositorio de Lumora

FastAPI

FastAPI Cloud

Neon

Backblaze B2 - S3 Compatible API

boto3 S3

Expo

EAS

Netlify

uv

Alembic

Lumora - salud conectada con seguridad y claridad.
