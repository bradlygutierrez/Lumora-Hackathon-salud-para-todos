import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useAuthStore } from '@/features/auth/store/auth-store';
import { ShellBootstrap } from '@/features/shell/components/ShellBootstrap';
import { usePatientContextStore } from '@/features/shell/store/patient-context-store';

const mockLoadIdentity = jest.fn();

jest.mock('@/features/shell/api/ShellContextService', () => ({
  CaregiverRelationsUnavailableError: class extends Error {},
  shellContextService: {
    loadIdentity: (...args: unknown[]) => mockLoadIdentity(...args),
  },
}));
jest.mock('@/features/shell/hooks/useCaregiverPatientsSync', () => ({
  useCaregiverPatientsSync: jest.fn(),
}));

describe('ShellBootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ status: 'authenticated' });
    usePatientContextStore.getState().clear();
  });

  it('does not render private screens before resolving the session role', async () => {
    let resolveIdentity!: (identity: {
      user: { id: number };
      role: 'caregiver';
      availablePatients: [];
    }) => void;

    mockLoadIdentity.mockReturnValue(
      new Promise((resolve) => {
        resolveIdentity = resolve;
      }),
    );

    const screen = await render(
      <ShellBootstrap>
        <Text>Private patient screen</Text>
      </ShellBootstrap>,
    );

    expect(screen.queryByText('Private patient screen')).toBeNull();
    await waitFor(() => expect(mockLoadIdentity).toHaveBeenCalledTimes(1));

    resolveIdentity({
      user: { id: 21 },
      role: 'caregiver',
      availablePatients: [],
    });

    await waitFor(() =>
      expect(screen.getByText('Private patient screen')).toBeTruthy(),
    );
    expect(usePatientContextStore.getState().status).toBe('needs-patient');
  });
});
