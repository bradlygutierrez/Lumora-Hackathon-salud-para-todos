import { Icon } from './Icon'

export function Ecosystem(): string {
  return `
    <section class="section ecosystem" id="nosotros">
      <div class="container ecosystem__content">
        <span class="eyebrow">El ecosistema Lumora</span>
        <h2>Dos experiencias conectadas por el cuidado</h2>
        <p>Lumora acompaña distintos momentos de la atención: ofrece al paciente herramientas para organizar su salud y al profesional recursos para documentar y dar seguimiento clínico.</p>
        <div class="ecosystem-flow" aria-label="Relación entre las dos aplicaciones de Lumora">
          <div>${Icon('user')}<strong>Paciente</strong><span>Lumora</span></div>
          <span class="ecosystem-flow__line" aria-hidden="true">↔</span>
          <div class="ecosystem-flow__center">Lumora<span>Un mismo ecosistema</span></div>
          <span class="ecosystem-flow__line" aria-hidden="true">↔</span>
          <div>${Icon('medical')}<strong>Profesional</strong><span>Lumora para Médicos</span></div>
        </div>
        <p class="brand-slogan">Lumora, iluminando el camino hacia una mejor salud.</p>
      </div>
    </section>
  `
}
