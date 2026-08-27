import axios, { type AxiosError } from 'axios';

/** Categorías de error que entiende la UI de Lumora. */
export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

/**
 * Error normalizado del frontend.
 *
 * En lugar de hacer `if (status === 401)` en cada pantalla, toda la app
 * recibe una estructura consistente con `code`, `status` y `message`.
 */
export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    public readonly status: number | null,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Solo errores temporales de red/servidor se reintentan automáticamente. */
  public isRetryable(): boolean {
    return this.code === 'NETWORK_ERROR' || this.code === 'SERVER_ERROR';
  }
}

type BackendDomainError = {
  error?: {
    code?: unknown;
    message?: unknown;
  };
  detail?: unknown;
  message?: unknown;
};

/** Traduce Axios/FastAPI al formato interno de Lumora. */
class ApiErrorMapper {
  public map(error: unknown): ApiError {
    // Evita convertir por segunda vez un error que ya normalizamos.
    if (error instanceof ApiError) {
      return error;
    }

    if (!axios.isAxiosError(error)) {
      return new ApiError(
        'UNKNOWN',
        null,
        'Ocurrió un error inesperado.',
        error,
      );
    }

    // Axios sin `response` significa que el servidor no respondió:
    // sin Internet, DNS, timeout, conexión rechazada, etc.
    if (!error.response) {
      return new ApiError(
        'NETWORK_ERROR',
        null,
        'No fue posible conectarse con el servidor.',
        error,
      );
    }

    const status = error.response.status;
    const data = error.response.data as BackendDomainError | undefined;

    return new ApiError(
      this.mapStatus(status),
      status,
      this.extractMessage(data),
      data,
    );
  }

  private mapStatus(status: number): ApiErrorCode {
    switch (status) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'VALIDATION';
      default:
        return status >= 500 ? 'SERVER_ERROR' : 'UNKNOWN';
    }
  }

  /**
   * Soporta los dos formatos reales usados actualmente por FastAPI:
   *
   * Error de dominio:
   * { "error": { "code": "...", "message": "..." } }
   *
   * Validación de Pydantic/FastAPI:
   * { "detail": [...] }
   */
  private extractMessage(data: BackendDomainError | undefined): string {
    const domainMessage = data?.error?.message;
    if (typeof domainMessage === 'string' && domainMessage.trim()) {
      return domainMessage;
    }

    if (typeof data?.detail === 'string' && data.detail.trim()) {
      return data.detail;
    }

    if (Array.isArray(data?.detail)) {
      return 'Hay datos inválidos en la solicitud.';
    }

    if (typeof data?.message === 'string' && data.message.trim()) {
      return data.message;
    }

    return 'La solicitud no pudo completarse.';
  }
}

export const apiErrorMapper = new ApiErrorMapper();

/** Helper para código que solo necesita convertir un error. */
export function toApiError(error: unknown): ApiError {
  return apiErrorMapper.map(error);
}
