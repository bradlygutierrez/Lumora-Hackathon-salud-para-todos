const benefits = [
  'Un resumen con citas, tratamientos e indicadores relevantes.',
  'Información presentada con lenguaje claro y jerarquía visual.',
  'Acceso pensado para pacientes y cuidadores autorizados.',
]

export function AppShowcase(): string {
  return `
    <section class="section app-showcase" aria-labelledby="patient-design-title">
      <div class="container split-layout split-layout--reverse">
        <div class="app-showcase__content">
          <span class="eyebrow">Diseñada para acompañarte</span>
          <h2 id="patient-design-title">Diseño humano en tu bolsillo</h2>
          <p class="lead">Lumora presenta la información importante de tu salud con una interfaz comprensible, accesible y enfocada en lo que necesitas.</p>
          <ul class="check-list">
            ${benefits.map((benefit) => `<li><span class="check-mark" aria-hidden="true">✓</span><span>${benefit}</span></li>`).join('')}
          </ul>
        </div>
        <div class="app-showcase__image" role="img" aria-label="Aplicaciones Lumora para pacientes y profesionales mostradas en dos teléfonos"></div>
      </div>
    </section>
  `
}
