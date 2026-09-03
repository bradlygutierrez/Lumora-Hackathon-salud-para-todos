import { escapeHtml } from '../../shared/ui/html'

function Brand(): string {
  return `
    <a class="portal-brand" href="#/afiliaciones" aria-label="Lumora Afiliaciones">
      <img src="/favicon.svg" alt="" />
      <span>Lumora</span>
    </a>
  `
}

export function LoginView(apiConfigured: boolean): string {
  return `
    <main class="auth-layout">
      <section class="auth-card" aria-labelledby="login-title">
        ${Brand()}
        <div class="auth-card__heading">
          <span class="eyebrow">Portal interno</span>
          <h1 id="login-title">Administración de afiliaciones</h1>
          <p>Acceso exclusivo para personal autorizado de Lumora.</p>
        </div>
        ${apiConfigured ? '' : '<div class="notice notice--warning">Falta configurar <strong>VITE_API_URL</strong>. El portal no podrá iniciar sesión hasta definir la URL pública del backend.</div>'}
        <form class="form-stack" data-login-form>
          <label class="field">
            <span>Usuario o correo</span>
            <input name="login" autocomplete="username" required maxlength="255" />
          </label>
          <label class="field">
            <span>Contraseña</span>
            <input name="password" type="password" autocomplete="current-password" required maxlength="128" />
          </label>
          <button class="button button--block" type="submit" ${apiConfigured ? '' : 'disabled'}>Ingresar</button>
        </form>
        <p class="auth-card__footnote">No existe registro público de personal o médicos desde este portal.</p>
      </section>
    </main>
  `
}

export function MfaView(method: string | null): string {
  return `
    <main class="auth-layout">
      <section class="auth-card" aria-labelledby="mfa-title">
        ${Brand()}
        <div class="auth-card__heading">
          <span class="eyebrow">Verificación adicional</span>
          <h1 id="mfa-title">Código de seguridad</h1>
          <p>${method ? `Método configurado: ${escapeHtml(method)}.` : 'Ingresa el código de 6 dígitos de tu método MFA.'}</p>
        </div>
        <form class="form-stack" data-mfa-form>
          <label class="field">
            <span>Código</span>
            <input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" required />
          </label>
          <button class="button button--block" type="submit">Verificar</button>
          <button class="button button--outline button--block" type="button" data-action="back-login">Volver</button>
        </form>
      </section>
    </main>
  `
}

export function ForbiddenView(userName: string): string {
  return `
    <main class="auth-layout">
      <section class="auth-card" aria-labelledby="forbidden-title">
        ${Brand()}
        <div class="auth-card__heading">
          <span class="eyebrow">Acceso restringido</span>
          <h1 id="forbidden-title">Sin permiso para afiliaciones</h1>
          <p>${escapeHtml(userName)}, tu cuenta inició sesión correctamente, pero no tiene el permiso <strong>afiliaciones:manage</strong>.</p>
        </div>
        <button class="button button--block" type="button" data-action="logout">Cerrar sesión</button>
      </section>
    </main>
  `
}
