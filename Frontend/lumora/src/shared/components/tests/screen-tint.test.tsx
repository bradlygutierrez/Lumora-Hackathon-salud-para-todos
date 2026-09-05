import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRef } from 'react';
import { ScrollView, Text } from 'react-native';
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

describe('Screen scrollRef', () => {
  it('forwards scrollRef to the internal ScrollView when scrollable', async () => {
    // Regresión: el tour guiado necesita esta ref para desplazar la
    // pantalla hasta un paso que está más abajo del viewport inicial --
    // sin reenviarla, el tooltip queda desfasado de la sección real.
    const scrollRef = createRef<ScrollView>();
    await renderWithClient(
      <Screen scrollable scrollRef={scrollRef}>
        <Text>Contenido</Text>
      </Screen>,
    );

    expect(scrollRef.current).not.toBeNull();
  });
});
