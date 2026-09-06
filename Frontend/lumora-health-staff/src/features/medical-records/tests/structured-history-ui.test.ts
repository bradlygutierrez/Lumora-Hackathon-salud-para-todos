import { ApiError } from '@/src/shared/api/api-error';
import { structuredHistoryErrorMessage } from '../components/structured-history.ui';

describe('J12 API error presentation', () => {
  it('keeps 409 duplicate/transition messages from FastAPI', () => {
    expect(
      structuredHistoryErrorMessage(
        new ApiError('La condición médica ya existe', 'conflict', 409),
        'guardar la condición',
      ),
    ).toBe('La condición médica ya existe');
  });

  it('maps 403, 404 and 422 to clinical UI states', () => {
    expect(
      structuredHistoryErrorMessage(
        new ApiError('Forbidden', 'forbidden', 403),
        'guardar antecedentes',
      ),
    ).toContain('No tenés permiso');
    expect(
      structuredHistoryErrorMessage(new ApiError('Not found', 'not_found', 404), 'editar'),
    ).toContain('ya no está disponible');
    expect(
      structuredHistoryErrorMessage(
        new ApiError('Validation', 'validation_error', 422),
        'editar',
      ),
    ).toContain('El servidor rechazó');
  });
});
