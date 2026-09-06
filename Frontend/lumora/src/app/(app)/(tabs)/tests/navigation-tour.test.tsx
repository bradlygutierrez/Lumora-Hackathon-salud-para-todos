import { render, waitFor } from '@testing-library/react-native';

import TabsLayout from '@/app/(app)/(tabs)/_layout';

const mockStartTour = jest.fn();
let mockShellState = {
  role: 'caregiver',
  status: 'ready',
  activePatient: { patientId: 7 } as { patientId: number } | null,
};

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0 }),
}));
jest.mock('@/features/shell/store/patient-context-store', () => ({
  usePatientContextStore: (
    selector: (state: typeof mockShellState) => unknown,
  ) => selector(mockShellState),
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
    useTourPersistence: () => ({ startTour: mockStartTour, endTour: jest.fn() }),
  };
});
jest.mock('expo-router', () => {
  const ReactRuntime = jest.requireActual('react') as typeof import('react');
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');
  const Tabs = Object.assign(
    ({
      children,
      initialRouteName,
    }: {
      children: React.ReactNode;
      initialRouteName: string;
    }) =>
      ReactRuntime.createElement(
        ReactRuntime.Fragment,
        null,
        ReactRuntime.createElement(Text, null, `Initial:${initialRouteName}`),
        children,
      ),
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
    mockShellState = {
      role: 'caregiver',
      status: 'ready',
      activePatient: { patientId: 7 },
    };
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
    mockShellState = {
      role: 'patient',
      status: 'ready',
      activePatient: { patientId: 7 },
    };
    await render(<TabsLayout />);

    expect(mockStartTour).not.toHaveBeenCalled();
  });

  it('does not start the caregiver tour before selecting a patient', async () => {
    mockShellState = {
      role: 'caregiver',
      status: 'needs-patient',
      activePatient: null,
    };
    const screen = await render(<TabsLayout />);

    expect(mockStartTour).not.toHaveBeenCalled();
    expect(screen.getByText('Initial:profile')).toBeTruthy();
  });
});
