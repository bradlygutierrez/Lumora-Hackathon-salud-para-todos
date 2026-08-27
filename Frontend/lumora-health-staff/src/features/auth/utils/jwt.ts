type JwtPayload = {
  sub?: string;
  sid?: number;
};

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(padded);
  }

  return '';
}

export function getUserIdFromAccessToken(token: string): number | undefined {
  const [, payload] = token.split('.');
  if (!payload) {
    return undefined;
  }

  try {
    const claims = JSON.parse(decodeBase64Url(payload)) as JwtPayload;
    const userId = Number(claims.sub);
    return Number.isFinite(userId) ? userId : undefined;
  } catch {
    return undefined;
  }
}

export function createUnsignedTestToken(userId: number) {
  const payload = btoa(JSON.stringify({ sub: String(userId), sid: 1 }));
  return `header.${payload}.signature`;
}
