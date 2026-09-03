


<p align="center"> <img src="Frontend/lumora-website/lumora-website/public/favicon.svg" width="96" alt="Logo de Lumora"> </p>

<h1 align="center">Lumora</h1>

<p align="center"> <strong>Plataforma integral para pacientes, cuidadores y profesionales de salud</strong><br> Guía técnica de instalación, desarrollo, pruebas y despliegue </p>

Contenido
Descripción

Arquitectura

Tecnologías

Estructura del repositorio

Requisitos previos

Inicio rápido

Variables de entorno

Base de datos y migraciones

Pruebas y validaciones

Flujo de desarrollo

Despliegue

Verificación posterior al despliegue

Seguridad

Integración continua

Solución de problemas

Estado técnico verificado

Descripción
Lumora es una solución digital de salud formada por una API central y tres clientes. La plataforma permite gestionar autenticación y MFA, perfiles, pacientes y cuidadores, citas, expedientes, consultas, diagnósticos, recetas, indicadores, alertas, recordatorios, notificaciones, roles, permisos y afiliaciones médicas.

Este README está dirigido a la persona que recibe el repositorio y necesita llevarlo desde una instalación limpia hasta las pruebas y el despliegue. Fue contrastado con la rama develop y el commit 4848111a62b9 del 2 de septiembre de 2026.

Componentes
Componente	Ubicación	Finalidad
API	Backend/	Reglas de negocio, seguridad, persistencia y API REST
Lumora	Frontend/lumora/	Aplicación Expo para pacientes y cuidadores
Lumora Health Staff	Frontend/lumora-health-staff/	Aplicación Expo para profesionales de salud
Portal institucional	Frontend/lumora-website/lumora-website/	Portal web Vite para flujos institucionales y afiliaciones
Arquitectura
flowchart TB
    P["Lumora · Paciente/Cuidador"]
    S["Lumora Health Staff"]
    W["Portal institucional"]
    API["FastAPI · /api/v1"]
    SRV["Servicios de dominio"]
    REP["Repositorios SQLAlchemy"]
    DB[("PostgreSQL · Neon")]

    P -->|HTTPS/REST| API
    S -->|HTTPS/REST| API
    W -->|HTTPS/REST| API
    API --> SRV
    SRV --> REP
    REP --> DB

    classDef client fill:#F1F7FC,stroke:#85BCE3,color:#17324D,stroke-width:2px;
    classDef api fill:#DDEFFC,stroke:#85BCE3,color:#17324D,stroke-width:2px;
    classDef service fill:#FFF7DF,stroke:#D5A53B,color:#4A3510,stroke-width:2px;
    classDef database fill:#FFF2C7,stroke:#D5A53B,color:#4A3510,stroke-width:2px;
    class P,S,W client;
    class API api;
    class SRV,REP service;
    class DB database;
El backend mantiene la separación Routers → Services → Repositories → Database. Los modelos ORM de SQLAlchemy están separados de los esquemas Pydantic que definen los contratos HTTP.

La API se publica bajo /api/v1. Entre sus módulos se encuentran autenticación, MFA, sesiones, cuenta, pacientes, cuidadores, profesionales, citas, expedientes, consultas, diagnósticos, condiciones médicas, recetas, horarios de medicación, indicadores, alertas, recordatorios, notificaciones, RBAC, afiliaciones y catálogos.

Tecnologías
Backend
Tecnología	Uso
Python 3.14	Lenguaje y runtime
FastAPI 0.141	API REST, validación e interfaz OpenAPI
Pydantic 2	Esquemas, validación y configuración
SQLAlchemy 2	ORM y acceso asíncrono a datos
Alembic	Migraciones del esquema
PostgreSQL / Neon	Base de datos relacional
asyncpg	Driver asíncrono de PostgreSQL
uv	Entorno, dependencias y ejecución reproducible
PyJWT	Tokens de acceso y actualización
Argon2 mediante pwdlib	Hash seguro de contraseñas
PyOTP y cryptography	TOTP/MFA y protección de secretos
ReportLab	Documentos clínicos PDF
pytest	Pruebas automatizadas
Docker	Imagen reproducible de producción
Aplicaciones móviles y web Expo
Tecnología	Uso
Expo SDK 54	Plataforma de desarrollo y compilación
React Native 0.81 / React 19	Interfaz multiplataforma
TypeScript 5.9	Tipado estático
Expo Router 6	Navegación basada en archivos
TanStack React Query	Estado remoto, caché y sincronización
Axios	Cliente HTTP
React Hook Form + Zod	Formularios y validación
Zustand	Estado local compartido
Expo Secure Store	Almacenamiento seguro de credenciales
NativeWind	Estilos utilitarios
Jest + Testing Library	Pruebas unitarias y de componentes
Portal institucional
Tecnología	Uso
Vite 8	Servidor de desarrollo y empaquetado
TypeScript 6	Lógica tipada del cliente
Vitest	Pruebas automatizadas
React Toastify	Notificaciones de interfaz
Estructura del repositorio
Lumora-Hackathon-salud-para-todos/
├── Backend/
│   ├── src/lumora_api/
│   │   ├── api/v1/          # Routers y dependencias HTTP
│   │   ├── core/            # Configuración, seguridad y utilidades
│   │   ├── db/              # Sesión, base y seed
│   │   ├── models/          # Modelos ORM
│   │   ├── repositories/    # Acceso a datos
│   │   ├── schemas/         # Contratos Pydantic
│   │   ├── services/        # Reglas de negocio
│   │   └── main.py          # Aplicación FastAPI
│   ├── migrations/          # Revisiones Alembic
│   ├── tests/               # Pruebas backend
│   ├── docs/                # Guías técnicas específicas
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── uv.lock
├── Frontend/
│   ├── lumora/              # Paciente y cuidador
│   ├── lumora-health-staff/ # Personal médico
│   └── lumora-website/
│       └── lumora-website/  # Portal Vite
└── .github/workflows/       # Integración continua
Requisitos previos
Instale las siguientes herramientas antes de comenzar:

Git.

Python 3.14.

uv para gestionar el backend.

Node.js 22 LTS y npm.

Una base PostgreSQL. El proyecto usa Neon en los entornos remotos.

Docker, solo si se utilizará el flujo contenerizado.

Una cuenta de Expo/EAS, solo para despliegues web o compilaciones nativas con EAS.

Compruebe las versiones disponibles:

git --version
python --version
uv --version
node --version
npm --version
docker --version
Inicio rápido
1. Clonar el repositorio
git clone https://github.com/bradlygutierrez/Lumora-Hackathon-salud-para-todos.git
cd Lumora-Hackathon-salud-para-todos
git switch develop
Para trabajar sobre una versión auditable, registre el commit antes de instalar:

git rev-parse HEAD
2. Levantar el backend
En Bash:

cd Backend
cp .env.example .env
uv sync --frozen
uv run alembic upgrade head
uv run python -m lumora_api.db.seed
uv run fastapi dev
En PowerShell, reemplace la copia del archivo por:

Copy-Item .env.example .env
Antes de ejecutar migraciones, edite .env y configure al menos DATABASE_URL y JWT_SECRET. El servidor local queda disponible en:

API: http://127.0.0.1:8000/api/v1

Documentación Swagger: http://127.0.0.1:8000/docs

Esquema OpenAPI: http://127.0.0.1:8000/openapi.json

3. Levantar Lumora para pacientes y cuidadores
Abra otra terminal desde la raíz del repositorio:

cd Frontend/lumora
cp .env.example .env
npm ci
npm start
Opciones habituales:

npm run android
npm run ios
npm run web
Si se prueba desde un teléfono físico, localhost apunta al teléfono y no a la computadora. Configure EXPO_PUBLIC_API_URL con una URL HTTPS accesible o con la IP de la máquina dentro de la misma red.

4. Levantar Lumora Health Staff
cd Frontend/lumora-health-staff
cp .env.example .env
npm ci
npm start
También están disponibles npm run android, npm run ios y npm run web.

5. Levantar el portal institucional
cd Frontend/lumora-website/lumora-website
cp .env.example .env
npm ci
npm run dev
Vite mostrará en la terminal la dirección local. El portal añade /api/v1 a VITE_API_URL; configure la variable con el origen del backend, por ejemplo http://127.0.0.1:8000.

Variables de entorno
Nunca suba .env con secretos. Use los archivos .env.example como contrato de configuración.

Backend
Variable	Requerida	Descripción
APP_NAME	No	Nombre visible de la API
ENVIRONMENT	Sí	development, test o production
DATABASE_URL	Sí	URI PostgreSQL; con Neon debe usar TLS
JWT_SECRET	Sí	Secreto aleatorio; en producción debe tener al menos 32 caracteres
JWT_ALGORITHM	No	Algoritmo JWT, por defecto HS256
API_V1_PREFIX	No	Prefijo, por defecto /api/v1
ACCESS_TOKEN_MINUTES	No	Vida del access token, por defecto 30 minutos
REFRESH_TOKEN_DAYS	No	Vida de la sesión renovable, por defecto 30 días
RECOVERY_TOKEN_MINUTES	No	Vida del token de recuperación
EMAIL_VERIFICATION_HOURS	No	Vigencia del enlace de verificación
VERIFICATION_CODE_MINUTES	No	Vigencia del código de verificación
VERIFICATION_RESEND_SECONDS	No	Espera mínima entre reenvíos
SMTP_HOST, SMTP_PORT	Para correo	Servidor SMTP
SMTP_USERNAME, SMTP_APP_PASSWORD	Para correo	Credenciales SMTP
EMAIL_FROM	Para correo	Remitente
MFA_CHALLENGE_MINUTES	No	Vigencia del desafío MFA
MFA_MAX_ATTEMPTS	No	Máximo de intentos MFA
MFA_RECOVERY_CODES	No	Cantidad de códigos de recuperación
CORS_ORIGINS	Sí en web	Lista JSON de orígenes autorizados
PROFILE_IMAGE_DIR	No	Carpeta de imágenes de perfil
PROFILE_IMAGE_BASE_URL	No	Ruta pública de imágenes
Ejemplo mínimo local:

ENVIRONMENT=development
DATABASE_URL=postgresql+asyncpg://USUARIO:CLAVE@HOST/BASE?ssl=require
JWT_SECRET=reemplace-por-un-secreto-aleatorio-de-32-caracteres-o-mas
CORS_ORIGINS=["http://localhost:8081","http://localhost:19006","http://127.0.0.1:4173"]
El cargador de configuración normaliza direcciones postgres:// y postgresql:// al dialecto asíncrono postgresql+asyncpg://. También transforma sslmode al parámetro ssl esperado por asyncpg.

Clientes Expo
Paciente/cuidador:

EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
Health Staff:

EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_ENABLE_UI_PREVIEW=false
Portal Vite
VITE_API_URL=http://127.0.0.1:8000
[!IMPORTANT]
Las variables que empiezan por EXPO_PUBLIC_ o VITE_ quedan incorporadas al código del cliente. Nunca coloque contraseñas, claves privadas, secretos JWT ni credenciales de base de datos en ellas.

Base de datos y migraciones
Ejecute todos los comandos desde Backend/.

Consultar el estado
uv run alembic heads
uv run alembic current
uv run alembic history
Aplicar migraciones
uv run alembic upgrade head
Cargar catálogos y roles base
uv run python -m lumora_api.db.seed
El seed está diseñado para poblar datos base de forma repetible. No sustituye las migraciones.

Crear una migración durante el desarrollo
uv run alembic revision --autogenerate -m "descripcion_del_cambio"
uv run alembic upgrade head
uv run pytest
Revise manualmente la migración generada antes de confirmarla. En producción, haga un respaldo o use una rama de Neon para validar cambios destructivos antes de aplicarlos a la rama principal.

Pruebas y validaciones
La secuencia recomendada va de las comprobaciones rápidas a las pruebas de integración y exportación.

Backend
Las pruebas usan SQLite en memoria, por lo que pytest no modifica la base de Neon configurada en .env.

cd Backend
uv sync --frozen
uv run pytest
Para salida compacta:

uv run pytest -q
Para ejecutar un módulo o caso específico:

uv run pytest tests/services/test_auth_service.py
uv run pytest -k "nombre_del_caso"
Lumora: paciente y cuidador
cd Frontend/lumora
npm ci
npm run lint
npm run typecheck
npm test -- --runInBand
EXPO_PUBLIC_API_URL=https://SU_API.example npx expo export --platform web
La variable EXPO_PUBLIC_API_URL debe estar disponible antes de exportar. La compilación detiene el proceso si falta.

Lumora Health Staff
cd Frontend/lumora-health-staff
npm ci
npm run lint
npm run typecheck
npm test -- --runInBand
npx expo export --platform web
Prueba E2E pública de Health Staff
El smoke test comprueba la pantalla pública de autenticación y que no exista un acceso de demostración o bypass visible.

npm run e2e:web:smoke
Prueba E2E clínica autenticada
Cree Frontend/lumora-health-staff/.env.e2e.local con una cuenta sintética de QA:

LUMORA_E2E_LOGIN=qa-profesional@example.test
LUMORA_E2E_PASSWORD=reemplace-esta-clave
LUMORA_E2E_TOTP_SECRET=SECRETO_TOTP_DE_QA
Si no se usa un secreto TOTP, se admite LUMORA_E2E_MFA_CODE. No use datos clínicos reales ni credenciales personales.

npm run e2e:web:clinical
Portal institucional
cd Frontend/lumora-website/lumora-website
npm ci
npm test
npm run build
npm run preview
Verificación completa antes de un Pull Request
Ejecute, como mínimo:

Backend                      uv run pytest
Frontend/lumora              lint + typecheck + test + export web
Frontend/lumora-health-staff lint + typecheck + test + export web
Portal Vite                  test + build
Flujo de desarrollo
Actualice develop y cree una rama corta: feat/..., fix/..., test/..., docs/... o chore/....

Mantenga la lógica HTTP en routers, las reglas de negocio en services y el acceso a datos en repositories.

Añada o actualice pruebas junto con el cambio.

Ejecute las validaciones del componente afectado.

Use commits con formato Conventional Commits, por ejemplo feat(auth): agregar rotación de sesión.

Abra un Pull Request hacia develop y espere que CI finalice correctamente.

Promueva a main mediante Pull Request cuando la versión esté lista para producción.

No mezcle refactors grandes con una corrección funcional urgente. Mantenga los contratos de API, los esquemas Pydantic y los tipos TypeScript sincronizados.

Despliegue
Lista previa obligatoria
Antes de desplegar:

Confirme que el commit correcto está en develop o main.

Ejecute todas las pruebas y compilaciones aplicables.

Configure secretos únicamente en el proveedor de despliegue.

Use ENVIRONMENT=production.

Genere un JWT_SECRET aleatorio de al menos 32 caracteres.

Configure DATABASE_URL con TLS.

Restrinja CORS_ORIGINS a los dominios reales de los clientes.

Compruebe uv run alembic heads y pruebe las migraciones en una rama de base de datos.

Verifique SMTP si se habilitarán recuperación y verificación por correo.

Conserve un procedimiento de reversión de aplicación y base de datos.

Backend en FastAPI Cloud
Desde Backend/:

uv sync --frozen
uv run pytest
uv run fastapi deploy
La primera ejecución puede abrir el navegador para autenticar la cuenta y seleccionar o crear el proyecto. Configure en FastAPI Cloud las variables de producción descritas anteriormente. La guía oficial está en Deploy FastAPI on FastAPI Cloud.

Una vez configurada la base, aplique el esquema y los datos base en el entorno de producción mediante un job controlado:

uv run alembic upgrade head
uv run python -m lumora_api.db.seed
No ejecute migraciones concurrentes desde varias réplicas de la aplicación.

Backend con Docker
Desde Backend/:

docker build -t lumora-api .

docker run --rm \
  --env-file .env \
  lumora-api \
  uv run alembic upgrade head

docker run --rm \
  --env-file .env \
  lumora-api \
  uv run python -m lumora_api.db.seed

docker run --rm \
  --env-file .env \
  -p 8000:8000 \
  lumora-api
La imagen usa Python 3.14 slim, instala dependencias congeladas con uv y sirve FastAPI en 0.0.0.0:8000. Consulte también la guía oficial de FastAPI con Docker.

Web de Lumora y Health Staff con EAS Hosting
Autentíquese en Expo y exporte el proyecto:

npx eas-cli@latest login
npx expo export --platform web
npx eas-cli@latest deploy
Ejecute esos comandos dentro de cada aplicación Expo y configure previamente EXPO_PUBLIC_API_URL con la URL HTTPS de producción. El primer despliegue conecta el proyecto de EAS y solicita un subdominio. Consulte EAS Hosting: Get started.

Frontend/lumora/app.json ya contiene un identificador de proyecto EAS. Health Staff todavía no declara uno, por lo que su primer despliegue debe crear o vincular el proyecto.

Portal institucional Vite
cd Frontend/lumora-website/lumora-website
npm ci
npm test
npm run build
Publique el contenido generado en dist/ en un host estático. Configure VITE_API_URL durante el build y añada el dominio definitivo a CORS_ORIGINS del backend. Después, ejecute npm run preview localmente como última comprobación del artefacto.

Aplicaciones nativas Android/iOS
El repositorio todavía no incluye eas.json; por tanto, el despliegue nativo en tiendas no es completamente reproducible desde el estado actual. Antes de generar binarios:

cd Frontend/lumora
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android
npx eas-cli@latest build --platform ios
Repita la configuración en Health Staff. Deben definirse perfiles de compilación, identificadores de paquete, credenciales de firma y cuentas de Google Play/App Store Connect. Consulte EAS Build. Confirme y versione eas.json antes de considerar cerrado el proceso de release.

Verificación posterior al despliegue
Después de publicar una versión, verifique en este orden:

GET / responde y muestra la información básica de la API.

/docs y /openapi.json cargan en el entorno permitido.

La revisión de Alembic desplegada coincide con head.

Un usuario de QA puede iniciar sesión y completar MFA.

Access token, refresh, cierre de sesión y revocación funcionan.

Los clientes pueden consultar su pantalla principal sin errores CORS.

Se puede crear y consultar un registro sintético del flujo crítico aplicable.

Los enlaces o códigos de correo llegan desde el remitente configurado.

Logs y alertas no exponen contraseñas, tokens ni datos clínicos.

Se conserva el commit, la fecha, la revisión de migración y el resultado de smoke tests del release.

Un ejemplo de comprobación HTTP:

curl --fail --show-error https://SU_API.example/
curl --fail --show-error https://SU_API.example/openapi.json > /dev/null
Seguridad
El proyecto incluye validación Pydantic/Zod, contraseñas con Argon2, JWT de corta duración, refresh tokens asociados a sesiones persistentes, revocación, registro de IP y user-agent, MFA TOTP, códigos de recuperación, RBAC y controles de acceso clínico en el backend.

Buenas prácticas operativas:

Mantenga JWT_SECRET, DATABASE_URL, SMTP y credenciales E2E fuera de Git.

Rote secretos ante cualquier exposición.

Use siempre HTTPS y TLS hacia PostgreSQL.

Limite CORS a orígenes concretos; no use * con credenciales.

Use usuarios sintéticos en pruebas end-to-end.

No registre tokens, secretos MFA ni información clínica en logs.

Ejecute análisis de dependencias y actualizaciones de forma periódica.

Revise el tiempo máximo de sesión y la política de inactividad de acuerdo con el entorno regulatorio.

Las variables públicas del frontend no son un almacén de secretos. La autorización debe permanecer en la API aunque la interfaz oculte una función.

Integración continua
Los workflows actuales ejecutan:

Workflow	Disparador	Comprobaciones
Backend	Pull Requests a develop y main	Python 3.14, uv sync --frozen, pytest
Health Staff	PR a develop/main con cambios en su carpeta	npm ci, lint, typecheck, Jest, export web y smoke E2E público
Cobertura pendiente en CI:

Lumora para pacientes/cuidadores no tiene un workflow equivalente.

El portal Vite no tiene workflow propio.

El E2E clínico autenticado no corre en CI porque requiere credenciales MFA de QA.

Antes de proteger main, conviene agregar workflows para los dos clientes faltantes y exigir todos los checks obligatorios.

Solución de problemas
EXPO_PUBLIC_API_URL is required
Cree .env en la aplicación Expo o exporte la variable antes de ejecutar Expo:

export EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
npx expo export --platform web
En PowerShell:

$env:EXPO_PUBLIC_API_URL = "http://127.0.0.1:8000"
npx expo export --platform web
El teléfono no se conecta al backend local
No use 127.0.0.1 desde un dispositivo físico. Use la IP LAN de la computadora, permita el puerto 8000 en el firewall y confirme que ambos dispositivos están en la misma red. Para escenarios remotos, use una URL HTTPS.

Error CORS en navegador
Agregue el origen exacto del frontend a la lista JSON CORS_ORIGINS y reinicie el backend. El esquema, dominio y puerto deben coincidir.

Alembic no encuentra la revisión correcta
uv run alembic heads
uv run alembic current
uv run alembic history
No codifique un identificador de revisión en scripts de despliegue. Use upgrade head y resuelva cualquier bifurcación de migraciones antes de producción.

Jest termina las pruebas pero no sale
Ejecute temporalmente:

npm test -- --runInBand --detectOpenHandles
Corrija timers, listeners o recursos no liberados; no normalice el uso permanente de --forceExit.

Problemas de instalación de Node
Borre solo los artefactos del componente afectado y reinstale desde su lockfile. En CI y entregas reproducibles use npm ci, no npm install.

Estado técnico verificado
Resultados obtenidos sobre develop@4848111a62b9:

Componente	Resultado
Backend	270 pruebas aprobadas
Lumora paciente/cuidador	lint sin errores, typecheck aprobado, 54 suites y 219 pruebas aprobadas, export web aprobado
Health Staff	lint y typecheck aprobados, 68 suites y 210 pruebas aprobadas, export web aprobado
Portal Vite	1 prueba aprobada y build de producción aprobado
Observaciones de calidad detectadas:

El backend emite avisos de deprecación de Pydantic y datetime.utcnow que conviene resolver progresivamente.

El lint de la app de pacientes termina sin errores, pero reporta 109 advertencias.

Jest en la app de pacientes reporta recursos abiertos después del resumen; las pruebas sí aprueban, pero se recomienda localizar los handles pendientes.

El repositorio no contiene eas.json, por lo que el release nativo requiere configuración adicional.

CI todavía no cubre la app de pacientes ni el portal Vite.

No existe un archivo LICENSE en la raíz; defina una licencia antes de distribuir el código fuera del equipo.

Referencias
Repositorio de Lumora

FastAPI

FastAPI Cloud

Expo

EAS Hosting

EAS Build

uv

Alembic

<p align="center"> <sub>Lumora · Salud conectada con seguridad y claridad</sub> </p>
