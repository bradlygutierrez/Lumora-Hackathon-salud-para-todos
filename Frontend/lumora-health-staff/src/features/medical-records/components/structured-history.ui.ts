import { toApiError } from '@/src/shared/api/api-error';
import type { CatalogItem } from '../types/structured-history.types';

export function catalogName(items: CatalogItem[] | undefined, id: number | null | undefined) {
  if (id === null || id === undefined) return 'No indicado';
  return items?.find((item) => item.id === id)?.nombre ?? `#${id}`;
}

export function formatClinicalDate(value: string | null | undefined) {
  if (!value) return 'Sin fecha';
  const parsed = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium' }).format(parsed);
}

export function formatClinicalDateTime(value: string | null | undefined) {
  if (!value) return 'Sin fecha';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('es-NI', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

export function structuredHistoryErrorMessage(error: unknown, action: string) {
  if (!error) return null;
  const apiError = toApiError(error);
  if (apiError.code === 'forbidden') {
    return `No tenés permiso para ${action}.`;
  }
  if (apiError.code === 'not_found') {
    return 'El registro, paciente, expediente o catálogo ya no está disponible.';
  }
  if (apiError.code === 'conflict') {
    return apiError.message;
  }
  if (apiError.code === 'validation_error') {
    return 'El servidor rechazó uno o más datos. Revisá el formulario.';
  }
  return apiError.message;
}

export function activeFilterValue(value: number | undefined): boolean | undefined {
  if (value === 1) return true;
  if (value === 2) return false;
  return undefined;
}
