import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8')

test('W01 convierte la web en portal interno y mantiene el backend como fuente de verdad', async () => {
  const [index, main, app, authApi, authViews, affiliationApi, affiliationTypes, affiliationViews, client, session, apiConfig, env, styles] = await Promise.all([
    read('../index.html'),
    read('../src/main.ts'),
    read('../src/app.ts'),
    read('../src/features/auth/api.ts'),
    read('../src/features/auth/views.ts'),
    read('../src/features/affiliations/api.ts'),
    read('../src/features/affiliations/types.ts'),
    read('../src/features/affiliations/views.ts'),
    read('../src/shared/api/client.ts'),
    read('../src/shared/auth/session.ts'),
    read('../src/shared/config/api.ts'),
    read('../.env.example'),
    read('../src/styles/portal.css'),
  ])

  assert.match(index, /<html lang="es">/)
  assert.match(index, /Lumora \| Salud conectada/)
  assert.match(index, /index,follow/)
  assert.match(main, /PortalApp/)
  assert.match(main, /Hero|Experiences|AppShowcase|MedicalStaff|Contact/)
  assert.match(main, /renderLanding/)
  assert.match(main, /#\/afiliaciones/)

  assert.match(env, /^VITE_API_URL=/m)
  assert.match(client, /VITE_API_URL/)
  assert.match(apiConfig, /\/api\/v1/)
  assert.doesNotMatch(client + app + authApi + affiliationApi, /backend-[a-z0-9-]+\.fastapicloud\.dev/i)

  assert.match(authApi, /'\/auth\/login'/)
  assert.match(authApi, /'\/auth\/me'/)
  assert.match(authApi, /'\/auth\/mfa\/verify'/)
  assert.match(authApi, /'\/auth\/logout'/)
  assert.doesNotMatch(authApi + authViews, /\/auth\/register/)
  assert.match(app, /afiliaciones:manage/)
  assert.match(await read('../src/components/Header.ts'), /Entrar al portal/)
  assert.match(await read('../src/components/Hero.ts'), /Entrar al portal de afiliaciones/)
  assert.match(session, /sessionStorage/)
  assert.doesNotMatch(session, /localStorage/)

  assert.match(affiliationApi, /'\/medical-affiliations'/)
  assert.match(affiliationApi, /\/medical-affiliations\/\$\{id\}\/professionals/)
  assert.match(affiliationApi, /\/medical-affiliations\/professionals\/\$\{professionalId\}\/license/)
  assert.match(affiliationApi, /licencia_verificada/)
  assert.match(affiliationApi, /activo/)

  assert.match(affiliationTypes, /cupos_usados: number/)
  assert.match(affiliationTypes, /cupos_disponibles: number/)
  assert.match(affiliationTypes, /'pending' \| 'active' \| 'suspended' \| 'cancelled'/)
  assert.match(affiliationTypes, /'pending' \| 'paid'/)
  assert.match(app, /type === 'independiente' \? 1/)
  assert.match(app, /estado: 'pending'/)
  assert.match(app, /pago_estado: 'pending'/)

  assert.match(affiliationViews, /Médico independiente/)
  assert.match(affiliationViews, /Institución médica/)
  assert.match(affiliationViews, /Verificar licencia/)
  assert.match(affiliationViews, /Suspender profesional/)
  assert.match(affiliationViews, /Cupos usados/)
  assert.match(affiliationViews, /Correo pendiente/)
  assert.doesNotMatch(affiliationViews, /password_hash|temporary_password/)

  assert.match(styles, /grid-template-columns: 248px/)
  assert.match(styles, /@media \(max-width: 860px\)/)
  assert.match(styles, /@media \(max-width: 640px\)/)
  assert.match(styles, /\.portal-dialog::backdrop/)
})
