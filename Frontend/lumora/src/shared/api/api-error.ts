import axios, { type AxiosError } from 'axios';

/**
 * Códigos de error estandarizados para la API.
 * Mapea errores HTTP a categorías significativas.
 */
export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

/**
 * Error personalizado para respuestas de API.
 * Extiende la clase Error nativa de JavaScript con propiedades específicas de API.
 *
 * @example
 * ```typescript
 * throw new ApiError('VALIDATION', 422, 'Email inválido', { field: 'email' });
 * ```
 */
export class ApiError extends Error {
  constructor(
    /** Código de error estandarizado */
    public readonly code: ApiErrorCode,
    /** Código de estado HTTP (ej: 401, 404, 500) */
    public readonly status: number | null,
    /** Mensaje de error legible para el usuario */
    message: string,
    /** Detalles adicionales del error (respuesta del servidor) */
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Convertidor de errores de Axios a ApiError.
 * Transforma cualquier tipo de error en un ApiError con información estandarizada.
 *
 * Responsabilidades:
 * - Validar si un error es de tipo Axios
 * - Distinguir entre errores de red y errores de API
 * - Mapear códigos HTTP a códigos de error
 * - Extraer mensajes de error de diferentes formatos
 *
 * @internal
 */
class ApiErrorConverter {
  /** Mapeo de códigos HTTP a códigos de error personalizados */
  private readonly statusCodeMap: Record<number, ApiErrorCode> = {
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION',
    500: 'SERVER_ERROR',
  };

  /**
   * Convierte cualquier tipo de error en un ApiError estandarizado.
   *
   * Flujo:
   * 1. Verifica si es un error de Axios
   * 2. Si no es Axios, retorna error desconocido
   * 3. Verifica si la respuesta está disponible
   * 4. Si no hay respuesta, es un error de red
   * 5. Si hay respuesta, extrae información del servidor
   *
   * @param error - Error desconocido a convertir
   * @returns ApiError con información estandarizada
   *
   * @example
   * ```typescript
   * try {
   *   await api.get('/users');
   * } catch (error) {
   *   const apiError = converter.convert(error);
   *   console.error(apiError.code);    // 'NOT_FOUND'
   *   console.error(apiError.status);  // 404
   * }
   * ```
   */
  convert(error: unknown): ApiError {
    if (!this.isAxiosError(error)) {
      return this.createUnknownError(error);
    }

    if (!this.hasResponse(error)) {
      return this.createNetworkError(error);
    }

    return this.createApiError(error);
  }

  /**
   * Valida si un error es de tipo AxiosError.
   * Funciona como un "type guard" para TypeScript.
   *
   * @param error - Error a validar
   * @returns true si es un AxiosError
   */
  private isAxiosError(error: unknown): error is AxiosError {
    return axios.isAxiosError(error);
  }

  /**
   * Verifica si el AxiosError contiene respuesta del servidor.
   *
   * @param error - Error de Axios
   * @returns true si hay respuesta (error del servidor)
   */
  private hasResponse(error: AxiosError): boolean {
    return error.response !== undefined;
  }

  /**
   * Crea ApiError para errores no identificados.
   * Se usa cuando el error no es de Axios.
   *
   * @param error - Error desconocido
   * @returns ApiError con código UNKNOWN
   */
  private createUnknownError(error: unknown): ApiError {
    return new ApiError(
      'UNKNOWN',
      null,
      'Ocurrió un error inesperado.',
      error,
    );
  }

  /**
   * Crea ApiError para errores de red.
   * Se usa cuando no hay respuesta del servidor (sin internet, timeout, etc).
   *
   * @param error - AxiosError sin respuesta
   * @returns ApiError con código NETWORK_ERROR
   */
  private createNetworkError(error: AxiosError): ApiError {
    return new ApiError(
      'NETWORK_ERROR',
      null,
      'No fue posible conectarse con el servidor.',
      error,
    );
  }

  /**
   * Crea ApiError desde respuesta del servidor.
   * Extrae código HTTP, mensaje y detalles de la respuesta.
   *
   * @param error - AxiosError con respuesta del servidor
   * @returns ApiError con información completa del servidor
   */
  private createApiError(error: AxiosError): ApiError {
    const status = error.response!.status;
    const data = error.response!.data as Record<string, unknown> | undefined;

    return new ApiError(
      this.mapStatusToCode(status),
      status,
      this.extractErrorMessage(data),
      data,
    );
  }

  /**
   * Mapea un código HTTP a un código de error personalizado.
   * Si el código no está en el mapa, retorna SERVER_ERROR para 5xx, UNKNOWN para otros.
   *
   * @param status - Código de estado HTTP (401, 404, 500, etc)
   * @returns Código de error estandarizado
   *
   * @example
   * ```typescript
   * mapStatusToCode(401) // 'UNAUTHORIZED'
   * mapStatusToCode(500) // 'SERVER_ERROR'
   * mapStatusToCode(999) // 'UNKNOWN'
   * ```
   */
  private mapStatusToCode(status: number): ApiErrorCode {
    return this.statusCodeMap[status] ??
      (status >= 500 ? 'SERVER_ERROR' : 'UNKNOWN');
  }

  /**
   * Extrae el mensaje de error de la respuesta del servidor.
   * Intenta buscar en: detail, message, o usa un mensaje por defecto.
   *
   * @param data - Datos de respuesta del servidor
   * @returns Mensaje de error legible para el usuario
   */
  private extractErrorMessage(
    data: Record<string, unknown> | undefined,
  ): string {
    return (
      (data?.detail as string) ??
      (data?.message as string) ??
      'La solicitud no pudo completarse.'
    );
  }
}

const converter = new ApiErrorConverter();

export function toApiError(error: unknown): ApiError {
  return converter.convert(error);
}