import { render } from '@testing-library/react-native';

import MedicalTimelineRoute from '@/app/(staff)/patients/[id]/record/timeline';

const mockUseLocalSearchParams = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

jest.mock('../screens/MedicalTimelineScreen', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    MedicalTimelineScreen: ({ patientId, recordId }: { patientId: number; recordId: number }) =>
      React.createElement(Text, null, `Timeline:${patientId}:${recordId}`),
  };
});

describe('MedicalTimelineRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes patient and record identifiers from the route to the timeline screen', async () => {
    mockUseLocalSearchParams.mockReturnValue({ id: '9', recordId: '17' });
    const screen = await render(<MedicalTimelineRoute />);
    expect(screen.getByText('Timeline:9:17')).toBeTruthy();
  });

  it('rejects an invalid record identifier', async () => {
    mockUseLocalSearchParams.mockReturnValue({ id: '9', recordId: 'invalid' });
    const screen = await render(<MedicalTimelineRoute />);
    expect(screen.getByText('Expediente inválido')).toBeTruthy();
  });
});
