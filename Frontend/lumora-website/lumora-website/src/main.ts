import './styles/tokens.css'
import './styles/base.css'
import './styles/portal.css'
import { PortalApp } from './app'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('No se encontró el contenedor principal de la aplicación')
}

void new PortalApp(app).start()
