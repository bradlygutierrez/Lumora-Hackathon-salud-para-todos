import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Text } from 'react-native';
import type { ReactElement } from 'react';

import { Screen } from '../Screen';

function renderWithClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('Screen tint', () => {
  it('defaults to the neutral background class', async () => {
    const screen = await renderWithClient(
      <Screen>
        <Text>Contenido</Text>
      </Screen>,
    );
    expect(screen.getByTestId('screen-root').props.className).toContain('bg-bone-100');
  });

  it.each([
    ['appointments', 'bg-lumen-300/10'],
    ['health', 'bg-mint-300/15'],
    ['medication', 'bg-warm-300/15'],
  ] as const)('applies the %s tint class', async (tint, expectedClass) => {
    const screen = await renderWithClient(
      <Screen tint={tint}>
        <Text>Contenido</Text>
      </Screen>,
    );
    expect(screen.getByTestId('screen-root').props.className).toContain(expectedClass);
  });
});
