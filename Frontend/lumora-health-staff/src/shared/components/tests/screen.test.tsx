import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { theme } from '../../constants/theme';
import { Screen } from '../Screen';

function backgroundColorOf(screen: { getByTestId: (id: string) => { props: { style?: unknown } } }) {
  const style = screen.getByTestId('screen-root').props.style;
  const flattened = Array.isArray(style) ? Object.assign({}, ...style) : style;
  return (flattened as { backgroundColor?: string }).backgroundColor;
}

describe('Screen tint', () => {
  it('defaults to the neutral app background when no tint is given', async () => {
    const screen = await render(
      <Screen>
        <Text>Contenido</Text>
      </Screen>,
    );
    expect(backgroundColorOf(screen)).toBe(theme.color.appBackground);
  });

  it.each([
    ['patients', theme.color.patientsWash],
    ['agenda', theme.color.agendaWash],
    ['directory', theme.color.directoryWash],
  ] as const)('applies the %s wash', async (tint, expected) => {
    const screen = await render(
      <Screen tint={tint}>
        <Text>Contenido</Text>
      </Screen>,
    );
    expect(backgroundColorOf(screen)).toBe(expected);
  });
});
