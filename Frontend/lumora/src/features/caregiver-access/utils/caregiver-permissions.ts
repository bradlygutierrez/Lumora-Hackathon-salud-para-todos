/**
 * A13 -- Deriva lo que un cuidador puede ver/hacer a partir del ÚNICO
 * nivel de acceso real que existe en el backend (`nivel_acceso`:
 * read/write en `relaciones_paciente`).
 *
 * El mockup de Figma de "Permisos y Contactos" muestra 4 renglones
 * independientes (expediente, alertas críticas, medicación, citas),
 * pero el backend solo modela dos permisos reales:
 *
 * - `nivel_acceso` (read/write) -- gobierna todas las mutaciones.
 * - `recibir_notificaciones` -- gobierna las alertas críticas.
 *
 * Por eso "expediente", "medicación" y "citas" se derivan todos del
 * mismo `nivel_acceso`: mostrar valores independientes para esos tres
 * renglones sin que existan datos independientes detrás sería engañoso.
 */

export type PermisoNivel = 'completo' | 'solo-lectura' | 'no-definido';

/** ¿Puede este cuidador registrar/editar datos del paciente? */
export function canManagePatientData(accessLevel: string | null): boolean {
  return accessLevel === 'write';
}

export function permisoNivel(accessLevel: string | null): PermisoNivel {
  if (accessLevel === 'write') {
    return 'completo';
  }

  if (accessLevel === 'read') {
    return 'solo-lectura';
  }

  return 'no-definido';
}

export function permisoNivelLabel(nivel: PermisoNivel): string {
  switch (nivel) {
    case 'completo':
      return 'Completo';
    case 'solo-lectura':
      return 'Solo lectura';
    default:
      return 'No definido';
  }
}
