import { render, waitFor } from '@testing-library/react-native';

import TabsLayout from '@/app/(app)/(tabs)/_layout';

const mockStartTour = jest.fn();
let mockRole = 'caregiver';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0 }),
}));
jest.mock('@/features/shell/store/patient-context-store', () => ({
  usePatientContextStore: (
    selector: (state: { role: string }) => unknown,
  ) => selector({ role: mockRole }),
}));
jest.mock('@wrack/react-native-tour-guide', () => {
  const ReactRuntime = jest.requireActual('react') as typeof import('react');
  const { Text, View } = jest.requireActual('react-native') as typeof import('react-native');

  return {
    TourTarget: ({
      children,
      id,
    }: {
      children: React.ReactNode;
      id: string;
    }) =>
      ReactRuntime.createElement(
        View,
        null,
        ReactRuntime.createElement(Text, null, `Target:${id}`),
        children,
      ),
    useTourPersistence: () => ({ startTour: mockStartTour }),
  };
});
jest.mock('expo-router', () => {
  const ReactRuntime = jest.requireActual('react') as typeof import('react');
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');
  const Tabs = Object.assign(
    ({ children }: { children: React.ReactNode }) =>
      ReactRuntime.createElement(ReactRuntime.Fragment, null, children),
    {
      Screen: ({
        name,
        options,
      }: {
        name: string;
        options: {
          tabBarIcon: (props: { color: string; size: number }) => React.ReactNode;
        };
      }) =>
        ReactRuntime.createElement(
          ReactRuntime.Fragment,
          null,
          ReactRuntime.createElement(Text, null, `Tab:${name}`),
          options.tabBarIcon({ color: '#000', size: 24 }),
        ),
    },
  );

  return { Tabs };
});

describe('Lumora navigation tour', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = 'caregiver';
  });

  it('registers every main tab and starts the caregiver tour', async () => {
    const screen = await render(<TabsLayout />);

    for (const target of [
      'tour-tab-home',
      'tour-tab-health',
      'tour-tab-medication',
      'tour-tab-appointments',
      'tour-tab-profile',
    ]) {
      expect(screen.getByText(`Target:${target}`)).toBeTruthy();
    }

    await waitFor(() => expect(mockStartTour).toHaveBeenCalledTimes(1));
    const [steps, config] = mockStartTour.mock.calls[0];
    expect(config.tourId).toBe('caregiver-navigation-tour');
    expect(steps.map((step: { targetId: string }) => step.targetId)).toEqual([
      'tour-tab-home',
      'tour-tab-health',
      'tour-tab-medication',
      'tour-tab-appointments',
      'tour-tab-profile',
    ]);
  });

  it('does not start the caregiver tour for a patient', async () => {
    mockRole = 'patient';
    await render(<TabsLayout />);

    expect(mockStartTour).not.toHaveBeenCalled();
  });
});
