import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { EditProfileScreen } from '../screens/EditProfileScreen';

const mockUseAccountProfile = jest.fn();
const mockUpdateMutate = jest.fn();
const mockBack = jest.fn();

jest.mock('../hooks/use-account', () => ({
  useAccountProfile: () => mockUseAccountProfile(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('@/src/shared/components/AppTopBar', () => ({
  AppTopBar: () => null,
}));

jest.mock('@/src/shared/components/Screen', () => {
  const React = jest.requireActual('react');
  return {
    Screen: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

const account = {
  id: 7,
  username: 'doctor',
  email: 'doctor@example.com',
  email_verified: true,
  profile_image_url: null,
  person: {
    id: 9,
    first_names: 'Ana',
    last_names: 'Mora',
    birth_date: null,
    phone: '8888-4444',
    email: 'doctor@example.com',
    sex_id: null,
    addresses: [],
  },
  roles: [],
};

describe('EditProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccountProfile.mockReturnValue({
      data: account,
      isLoading: false,
      isError: false,
      update: { mutate: mockUpdateMutate, isPending: false, error: null },
      uploadImage: { mutate: jest.fn(), isPending: false },
      deleteImage: { mutate: jest.fn(), isPending: false },
    });
  });

  it('pre-fills the form with the account data', async () => {
    const screen = await render(<EditProfileScreen />);

    expect(screen.getByDisplayValue('Ana')).toBeTruthy();
    expect(screen.getByDisplayValue('Mora')).toBeTruthy();
    expect(screen.getByDisplayValue('doctor@example.com')).toBeTruthy();
    expect(screen.getByDisplayValue('8888-4444')).toBeTruthy();
  });

  it('submits the updated fields to the account mutation', async () => {
    const screen = await render(<EditProfileScreen />);

    fireEvent.changeText(screen.getByDisplayValue('Ana'), 'Ana María');
    fireEvent.press(screen.getByText('Guardar cambios'));

    await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalledTimes(1));
    expect(mockUpdateMutate.mock.calls[0][0]).toEqual({
      email: 'doctor@example.com',
      person: {
        first_names: 'Ana María',
        last_names: 'Mora',
        phone: '8888-4444',
      },
    });
  });

  it('shows a loading state while the account is loading', async () => {
    mockUseAccountProfile.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      update: { mutate: mockUpdateMutate, isPending: false, error: null },
      uploadImage: { mutate: jest.fn(), isPending: false },
      deleteImage: { mutate: jest.fn(), isPending: false },
    });

    const screen = await render(<EditProfileScreen />);

    expect(screen.queryByText('Editar Perfil')).toBeNull();
  });
});
