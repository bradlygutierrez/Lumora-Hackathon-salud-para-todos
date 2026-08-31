import { filterActiveRelaciones } from '@/features/familiares/utils/filter-active-relaciones';
import type { RelacionPacienteResponse } from '@/features/familiares/types/familiares.types';

function relacion(overrides: Partial<RelacionPacienteResponse>): RelacionPacienteResponse {
  return {
    id: 1,
    paciente_id: 6,
    usuario_relacionado_id: 5,
    tipo_relacion_id: 1,
    recibir_notificaciones: true,
    activo: true,
    estado: 'active',
    nivel_acceso: 'read',
    expira_en: null,
    creado_en: '2026-08-01T00:00:00.000Z',
    usuario_relacionado: { id: 5, full_name: 'B09 Caregiver Test', email: 'caregiver@test.com' },
    tipo_relacion: { id: 1, nombre: 'Otro' },
    ...overrides,
  };
}

describe('filterActiveRelaciones', () => {
  it('incluye solo relaciones activo=true y estado="active"', () => {
    const activa = relacion({ id: 1 });
    const revocada = relacion({ id: 2, estado: 'revoked', activo: false });
    const pendiente = relacion({ id: 3, estado: 'pending' });
    const inactivaPeroEstadoActive = relacion({ id: 4, activo: false, estado: 'active' });

    const result = filterActiveRelaciones([activa, revocada, pendiente, inactivaPeroEstadoActive]);

    expect(result.map((r) => r.id)).toEqual([1]);
  });

  it('devuelve lista vacía cuando no hay relaciones activas', () => {
    const revocada = relacion({ id: 2, estado: 'revoked', activo: false });

    expect(filterActiveRelaciones([revocada])).toEqual([]);
  });

  it('devuelve lista vacía cuando no hay relaciones', () => {
    expect(filterActiveRelaciones([])).toEqual([]);
  });
});
