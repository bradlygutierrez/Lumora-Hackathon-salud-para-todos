// Los módulos que importan `env` se evalúan durante los tests.
process.env.EXPO_PUBLIC_API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://example.test';

// SecureStore depende de APIs nativas que no existen dentro de Jest/Node.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// @react-native-community/datetimepicker depende de módulos nativos -- para
// simular la elección de una fecha en tests, se dispara `onChange` a mano
// vía testID en vez de intentar abrir el picker nativo real.
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) =>
      React.createElement(View, { testID: 'date-time-picker', ...props }),
    DateTimePickerAndroid: { open: jest.fn() },
  };
});
