export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim()
  if (!configured) return ''

  const base = configured.replace(/\/+$/, '')
  return base.endsWith('/api/v1') ? base : `${base}/api/v1`
}
