import {
  structuredHistoryPathForSection,
  structuredHistoryPathForTimelineEvent,
} from '../components/structured-history.navigation';

describe('J12 medical record navigation', () => {
  it('routes the four structured sections from the J10 summary', () => {
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
    expect(structuredHistoryPathForSection(9, 17, 'diagnosticos')).toBeNull();
  });

  it('routes backend timeline events only when J12 has a real destination', () => {
    expect(structuredHistoryPathForTimelineEvent(9, 17, 'condicion')).toBe(
      '/(staff)/patients/9/record/conditions?recordId=17',
    );
    expect(structuredHistoryPathForTimelineEvent(9, 17, 'historial_condicion')).toBe(
      '/(staff)/patients/9/record/conditions?recordId=17',
    );
    expect(structuredHistoryPathForTimelineEvent(9, 17, 'antecedente')).toBe(
      '/(staff)/patients/9/record/history?recordId=17',
    );
    expect(structuredHistoryPathForTimelineEvent(9, 17, 'diagnostico')).toBeNull();
  });
});
