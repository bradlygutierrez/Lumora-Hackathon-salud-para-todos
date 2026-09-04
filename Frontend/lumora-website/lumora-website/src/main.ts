import './styles/tokens.css'
import './styles/base.css'
import './styles/portal.css'
import './styles/landing.css'
import { PortalApp } from './app'
import { AppShowcase } from './components/AppShowcase'
import { Contact } from './components/Contact'
import { Ecosystem } from './components/Ecosystem'
import { Experiences } from './components/Experiences'
import { Features } from './components/Features'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { MedicalStaff } from './components/MedicalStaff'

function renderLanding(root: HTMLDivElement): void {
  root.innerHTML = `${Header()}<main>${Hero()}${Features()}${Experiences()}${AppShowcase()}${MedicalStaff()}${Ecosystem()}${Contact()}</main>${Footer()}`
}

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('No se encontró el contenedor principal de la aplicación')
}

const portal = new PortalApp(app)
const isPortalRoute = (hash: string): boolean => hash.startsWith('#/afiliaciones') || ['#/cuentas', '#/pacientes', '#/medicos'].includes(hash)
if (isPortalRoute(window.location.hash)) void portal.start()
else renderLanding(app)
window.addEventListener('hashchange', () => {
  if (isPortalRoute(window.location.hash)) void portal.start()
  else renderLanding(app)
})
