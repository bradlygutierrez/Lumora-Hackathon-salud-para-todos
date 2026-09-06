import { Brand } from './Brand'

export function Footer(): string {
  return `
    <footer class="site-footer">
      <div class="container footer__grid">
        <div>${Brand()}<p>Lumora, iluminando el camino hacia una mejor salud.</p></div>
        <nav aria-label="Productos"><strong>Productos</strong><a href="#lumora">Lumora</a><a href="#lumora-medicos">Lumora para Médicos</a></nav>
        <nav aria-label="Compañía"><strong>Compañía</strong><a href="#nosotros">Ecosistema</a><a href="#contacto">Contacto</a></nav>
        <nav aria-label="Legal"><strong>Legal</strong><a href="mailto:lumorahealthnic@gmail.com?subject=Política%20de%20privacidad">Privacidad</a><a href="mailto:lumorahealthnic@gmail.com?subject=Términos%20de%20servicio">Términos de servicio</a></nav>
      </div>
      <div class="container footer__bottom">© ${new Date().getFullYear()} Lumora Health. Todos los derechos reservados.</div>
    </footer>
  `
}
