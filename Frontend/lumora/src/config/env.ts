const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

if (!apiUrl) {
  throw new Error(
    'EXPO_PUBLIC_API_URL no está configurada. Agregala al archivo .env.',
  );
}

export const env = {
  apiUrl: apiUrl.replace(/\/+$/, ''),
} as const;