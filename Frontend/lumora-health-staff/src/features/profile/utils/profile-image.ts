import { env } from '@/src/application/config/env';

// El backend puede devolver una URL absoluta (bucket público R2/B2) o una
// ruta relativa servida por el propio backend (ej. modo "local" de
// desarrollo, o bucket privado -- ver Backend/src/lumora_api/api/media.py).
// env.apiBaseUrl trae el sufijo /api/v1, que no aplica a /media/*.
function apiOrigin(): string {
  return env.apiBaseUrl.replace(/\/api\/v1\/?$/, '');
}

export function resolveProfileImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^(https?:|file:|content:|data:|blob:)/i.test(url)) return url;
  return `${apiOrigin()}${url.startsWith('/') ? '' : '/'}${url}`;
}
