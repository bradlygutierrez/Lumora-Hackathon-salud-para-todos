import { Icon, type IconName } from './Icon'

const features: { icon: IconName; title: string; description: string }[] = [
  { icon: 'calendar', title: 'Citas médicas', description: 'Agenda, consulta, reprograma o cancela tus citas desde un solo lugar.' },
  { icon: 'pill', title: 'Tratamientos a mano', description: 'Consulta tus recetas, horarios de medicamentos y registra las dosis tomadas.' },
  { icon: 'heart', title: 'Indicadores de salud', description: 'Registra mediciones personales y revisa su historial de forma clara.' },
  { icon: 'check', title: 'Recordatorios', description: 'Organiza recordatorios de cuidado y consulta tus notificaciones pendientes.' },
]

export function Features(): string {
  return `
    <section class="section features product-section" id="lumora">
      <div class="container">
        <div class="section-heading">
          <span class="eyebrow">Lumora · Para pacientes</span>
          <h2>Tu salud, más cerca de ti</h2>
          <p>Consulta y organiza aspectos importantes de tu cuidado desde una experiencia clara y accesible.</p>
        </div>
        <div class="feature-grid">
          ${features.map(({ icon, title, description }) => `
            <article class="feature-card">
              <span class="feature-card__icon">${Icon(icon)}</span>
              <h3>${title}</h3>
              <p>${description}</p>
            </article>
          `).join('')}
        </div>
      </div>
    </section>
  `
}
