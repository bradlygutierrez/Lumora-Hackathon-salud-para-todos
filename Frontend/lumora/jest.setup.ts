// Los módulos que importan `env` se evalúan durante los tests.
process.env.EXPO_PUBLIC_API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://example.test';

// SecureStore depende de APIs nativas que no existen dentro de Jest/Node.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
