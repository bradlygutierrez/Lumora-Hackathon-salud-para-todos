import { Icon } from './Icon'

export function Experiences(): string {
  return `
    <section class="section experiences" id="experiencias">
      <div class="container">
        <div class="section-heading">
          <span class="eyebrow">Una plataforma, dos perspectivas</span>
          <h2>Dos experiencias. Un mismo objetivo.</h2>
          <p>Lumora adapta sus herramientas a las necesidades de cada persona dentro del proceso de atención.</p>
        </div>
        <div class="experience-grid">
          <article class="experience-card experience-card--patient">
            <span class="experience-card__icon">${Icon('heart')}</span><small>Para pacientes</small>
            <h3>Lumora</h3>
            <p>Consulta y organiza citas, tratamientos e indicadores de salud desde una experiencia sencilla y personal.</p>
            <a href="#lumora">Descubrir Lumora <span aria-hidden="true">→</span></a>
          </article>
          <article class="experience-card experience-card--staff">
            <span class="experience-card__icon">${Icon('medical')}</span><small>Para profesionales de salud</small>
            <h3>Lumora para Médicos</h3>
            <p>Consulta información clínica, documenta la atención y da seguimiento a pacientes desde un espacio dedicado.</p>
            <a href="#lumora-medicos">Descubrir Lumora para Médicos <span aria-hidden="true">→</span></a>
          </article>
        </div>
      </div>
    </section>
  `
}
