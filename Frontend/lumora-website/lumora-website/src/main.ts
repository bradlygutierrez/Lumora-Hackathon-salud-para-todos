import './styles/tokens.css'
import './styles/base.css'
import './styles/landing.css'
import 'toastify-js/src/toastify.css'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { Experiences } from './components/Experiences'
import { Features } from './components/Features'
import { AppShowcase } from './components/AppShowcase'
import { MedicalStaff } from './components/MedicalStaff'
import { Ecosystem } from './components/Ecosystem'
import { Contact, setupContactForm } from './components/Contact'
import { Footer } from './components/Footer'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('No se encontró el contenedor principal de la aplicación')
}

app.innerHTML = `
  ${Header()}
  <main>
    ${Hero()}
    ${Experiences()}
    ${Features()}
    ${AppShowcase()}
    ${MedicalStaff()}
    ${Ecosystem()}
    ${Contact()}
  </main>
${Footer()}
`

setupContactForm()
