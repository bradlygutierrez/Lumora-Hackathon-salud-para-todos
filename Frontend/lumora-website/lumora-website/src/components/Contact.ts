import { Icon } from './Icon'
import Toastify from 'toastify-js'

const LUMORA_APK_URL = 'https://github.com/bradlygutierrez/Lumora-Hackathon-salud-para-todos/releases/latest/download/Lumora.apk'
const HEALTH_STAFF_APK_URL = 'https://github.com/bradlygutierrez/Lumora-Hackathon-salud-para-todos/releases/latest/download/LumoraHealthStaff.apk'

export function Contact(): string {
  return `
    <section class="section contact" id="contacto">
      <div class="container contact__grid">
        <div class="download-card">
          <span class="eyebrow">Descarga para Android</span>
          <h2>Elige tu experiencia Lumora</h2>
          <p>Instala la aplicación para pacientes y cuidadores o la aplicación para personal clínico. Ambas se descargan como archivos APK.</p>
          <p class="brand-slogan brand-slogan--left">Lumora, iluminando el camino hacia una mejor salud.</p>
          <div class="button-row" aria-label="Descargas de aplicaciones Lumora">
            <a class="button" href="${LUMORA_APK_URL}" download>Descargar Lumora</a>
            <a class="button button--outline" href="${HEALTH_STAFF_APK_URL}" download>Descargar Lumora Médicos</a>
          </div>
        </div>
        <div class="contact-card">
          <h2>Escríbenos</h2>
          <p>Cuéntanos cuál de las dos aplicaciones quieres conocer.</p>
          <form action="https://formspree.io/f/mwlkvodz" method="POST" data-contact-form>
            <label for="name">Nombre completo</label>
            <input id="name" name="nombre" autocomplete="name" placeholder="Ej. Ana Pérez" required />
            <label for="email">Correo electrónico</label>
            <input id="email" name="email" type="email" autocomplete="email" placeholder="ana@ejemplo.com" required />
            <label for="message">Mensaje</label>
            <textarea id="message" name="message" rows="4" placeholder="¿En qué podemos ayudarte?" required></textarea>
            <button class="button button--block" type="submit">Enviar mensaje</button>
          </form>
          <address class="contact-details">
            <a href="mailto:lumorahealthnic@gmail.com">${Icon('mail')}lumorahealthnic@gmail.com</a>
          </address>
        </div>
      </div>
    </section>
  `
}

export function setupContactForm(): void {
  const form = document.querySelector<HTMLFormElement>('[data-contact-form]')
  if (!form) return
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')
    if (!submit) return
    submit.disabled = true
    submit.textContent = 'Enviando…'
    try {
      const response = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      if (!response.ok) throw new Error('No se pudo enviar el formulario')
      form.reset()
      Toastify({ text: 'Mensaje enviado. Gracias por escribirnos.', duration: 4000, gravity: 'top', position: 'right', className: 'toastify-success', close: true }).showToast()
    } catch {
      Toastify({ text: 'No pudimos enviar tu mensaje. Inténtalo de nuevo.', duration: 4000, gravity: 'top', position: 'right', className: 'toastify-error', close: true }).showToast()
    } finally {
      submit.disabled = false
      submit.textContent = 'Enviar mensaje'
    }
  })
}
