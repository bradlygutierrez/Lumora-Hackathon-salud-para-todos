import { Brand } from './Brand'
import { Icon } from './Icon'

const navigation = `
  <a href="#lumora">Lumora</a>
  <a href="#lumora-medicos">Para Médicos</a>
  <a href="#nosotros">Ecosistema</a>
  <a class="button button--small" href="#contacto">Contacto</a>
`

export function Header(): string {
  return `
    <header class="site-header">
      <div class="container header__content">
        ${Brand()}
        <nav class="desktop-nav" aria-label="Navegación principal">${navigation}</nav>
        <details class="mobile-nav">
          <summary aria-label="Abrir menú">${Icon('menu')}</summary>
          <nav aria-label="Navegación móvil">${navigation}</nav>
        </details>
      </div>
    </header>
  `
}
