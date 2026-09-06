import { isAxiosError } from 'axios';

export type ApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'validation_error'
  | 'server_error'
  | 'offline'
  | 'unknown';

const statusCodeMap: Record<number, ApiErrorCode> = {
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  422: 'validation_error',
  500: 'server_error',
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status?: number;
  readonly details?: unknown;

  constructor(message: string, code: ApiErrorCode, status?: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (isAxiosError(error)) {
    if (!error.response) {
      return new ApiError('No hay conexión con Lumora API.', 'offline');
    }

    const status = error.response.status;
    const body = error.response.data as { error?: { message?: string }; detail?: unknown };
    const message =
      body.error?.message ??
      (typeof body.detail === 'string' ? body.detail : undefined) ??
      'No se pudo completar la solicitud.';

    return new ApiError(message, statusCodeMap[status] ?? 'unknown', status, body);
  }

  return new ApiError('Ocurrió un error inesperado.', 'unknown');
}
