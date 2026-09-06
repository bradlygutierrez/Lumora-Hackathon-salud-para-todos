import { Icon, type IconName } from './Icon'

const staffFeatures: { icon: IconName; title: string; description: string }[] = [
  { icon: 'user', title: 'Pacientes organizados', description: 'Consulta pacientes autorizados y accede a un resumen de su información clínica.' },
  { icon: 'clipboard', title: 'Expediente clínico', description: 'Revisa antecedentes, condiciones, alergias y la línea de tiempo del paciente.' },
  { icon: 'medical', title: 'Registro de atención', description: 'Documenta consultas, signos vitales y notas clínicas según tus permisos.' },
  { icon: 'pill', title: 'Diagnósticos y tratamientos', description: 'Registra diagnósticos y recetas vinculados con la atención del paciente.' },
]

export function MedicalStaff(): string {
  return `
    <section class="section staff-section product-section" id="lumora-medicos">
      <div class="container staff-layout">
        <div class="staff-section__intro">
          <span class="eyebrow">Lumora para Médicos · Para profesionales de salud</span>
          <h2>Más contexto para cuidar mejor</h2>
          <p class="lead">Un espacio dedicado para consultar información clínica, documentar la atención y mantener la continuidad del expediente, según el rol y los permisos del profesional.</p>
          <div class="staff-visual" role="img" aria-label="Vista de Lumora para Médicos en un teléfono"></div>
        </div>
        <div class="staff-feature-grid">
          ${staffFeatures.map(({ icon, title, description }) => `<article class="feature-card staff-feature"><span class="feature-card__icon">${Icon(icon)}</span><h3>${title}</h3><p>${description}</p></article>`).join('')}
        </div>
      </div>
    </section>
  `
}
