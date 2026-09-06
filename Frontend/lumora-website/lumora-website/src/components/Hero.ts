export function Hero(): string {
  return `
    <section class="hero section" id="inicio">
      <div class="container split-layout">
        <div class="hero__content">
          <span class="eyebrow">El ecosistema Lumora</span>
          <h1>Cuidado de salud conectado, <span>para pacientes y profesionales</span></h1>
          <p class="lead">Lumora reúne dos experiencias diseñadas para hacer más simple el seguimiento de la salud, la atención y la gestión de información clínica.</p>
          <div class="button-row">
            <a class="button" href="#/afiliaciones">Entrar al portal de afiliaciones</a>
            <a class="button button--outline" href="#lumora-medicos">Para profesionales</a>
          </div>
        </div>
        <div class="ecosystem-preview" aria-label="Lumora para pacientes y profesionales de salud">
          <article class="ecosystem-preview__app ecosystem-preview__app--patient"><span>Para pacientes</span><strong>Lumora</strong><p>Tu salud, más cerca de ti.</p></article>
          <span class="ecosystem-preview__brand">Lumora</span>
          <article class="ecosystem-preview__app ecosystem-preview__app--staff"><span>Para profesionales</span><strong>Lumora para Médicos</strong><p>Más contexto para cuidar mejor.</p></article>
        </div>
      </div>
    </section>
  `
}
