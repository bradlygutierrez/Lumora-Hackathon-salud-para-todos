/**
 * Configuración central de ambiente de Lumora.
 *
 * En React web esto cumple un papel parecido a un archivo `config.ts`
 * que lee `import.meta.env`. En Expo, las variables públicas usan el
 * prefijo `EXPO_PUBLIC_` y se leen desde `process.env`.
 */
class EnvironmentConfig {
  /** URL base del servidor, sin slash final. */
  public readonly apiUrl: string;

  /** URL versionada que usan los endpoints actuales de FastAPI. */
  public readonly apiV1Url: string;

  constructor() {
    const rawApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

    if (!rawApiUrl) {
      throw new Error(
        'EXPO_PUBLIC_API_URL no está configurada. Crea Frontend/lumora/.env usando .env.example.',
      );
    }

    this.apiUrl = rawApiUrl.replace(/\/+$/, '');

    // El backend monta todos los routers funcionales bajo /api/v1.
    // Si alguien coloca /api/v1 directamente en .env, evitamos duplicarlo.
    this.apiV1Url = this.apiUrl.endsWith('/api/v1')
      ? this.apiUrl
      : `${this.apiUrl}/api/v1`;
  }
}

/** Una sola instancia compartida por toda la aplicación. */
export const env = new EnvironmentConfig();
