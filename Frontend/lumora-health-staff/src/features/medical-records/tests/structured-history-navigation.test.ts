import {
  structuredHistoryPathForSection,
  structuredHistoryPathForTimelineEvent,
} from '../components/structured-history.navigation';

describe('J12/J13 medical record navigation', () => {
  it('routes structured history and prescription sections from the record summary', () => {
    expect(structuredHistoryPathForSection(9, 17, 'condiciones')).toBe(
      '/(staff)/patients/9/record/conditions?recordId=17',
    );
    expect(structuredHistoryPathForSection(9, 17, 'alergias')).toBe(
      '/(staff)/patients/9/record/allergies?recordId=17',
    );
    expect(structuredHistoryPathForSection(9, 17, 'discapacidades')).toBe(
      '/(staff)/patients/9/record/disabilities?recordId=17',
    );
    expect(structuredHistoryPathForSection(9, 17, 'historial')).toBe(
      '/(staff)/patients/9/record/history?recordId=17',
    );
    expect(structuredHistoryPathForSection(9, 17, 'recetas')).toBe(
      '/(staff)/patients/9/prescriptions?recordId=17',
    );
    expect(structuredHistoryPathForSection(9, 17, 'diagnosticos')).toBeNull();
  });

  it('routes timeline events only when there is a supported J12/J13 destination', () => {
    expect(structuredHistoryPathForTimelineEvent(9, 17, 'condicion')).toBe(
      '/(staff)/patients/9/record/conditions?recordId=17',
    );
    expect(structuredHistoryPathForTimelineEvent(9, 17, 'historial_condicion')).toBe(
      '/(staff)/patients/9/record/conditions?recordId=17',
    );
    expect(structuredHistoryPathForTimelineEvent(9, 17, 'antecedente')).toBe(
      '/(staff)/patients/9/record/history?recordId=17',
    );
    expect(structuredHistoryPathForTimelineEvent(9, 17, 'receta')).toBe(
      '/(staff)/patients/9/prescriptions?recordId=17',
    );
    // Diagnósticos son por consulta y el evento agregado no expone consulta_id.
    expect(structuredHistoryPathForTimelineEvent(9, 17, 'diagnostico')).toBeNull();
  });
});