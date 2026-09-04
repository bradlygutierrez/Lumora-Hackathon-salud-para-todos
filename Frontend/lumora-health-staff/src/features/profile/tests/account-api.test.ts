import { apiClient } from '@/src/shared/api/client';
import { deleteProfileImage, getAccount, updateAccount, uploadProfileImage } from '../api/account.api';

jest.mock('@/src/shared/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApiClient = jest.mocked(apiClient);

describe('account API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads the authenticated account', async () => {
    mockedApiClient.get.mockResolvedValueOnce({ data: { id: 1 } });

    await getAccount();

    expect(mockedApiClient.get).toHaveBeenCalledWith('/account/me');
  });

  it('updates the authenticated account', async () => {
    mockedApiClient.patch.mockResolvedValueOnce({ data: { id: 1 } });

    await updateAccount({ username: 'nueva' });

    expect(mockedApiClient.patch).toHaveBeenCalledWith('/account/me', { username: 'nueva' });
  });

  it('deletes the profile image', async () => {
    mockedApiClient.delete.mockResolvedValueOnce({ data: { profile_image_url: null } });

    await deleteProfileImage();

    expect(mockedApiClient.delete).toHaveBeenCalledWith('/account/me/profile-image');
  });

  it('uploads the profile image as FormData without a manual Content-Type header', async () => {
    // Regresión: fijar el header a mano ('multipart/form-data' sin boundary)
    // rompe el parseo del backend y siempre devuelve 422. axios/RN deben
    // generar el header ellos mismos a partir del FormData.
    mockedApiClient.post.mockResolvedValueOnce({ data: { profile_image_url: 'https://cdn/img.jpg' } });

    await uploadProfileImage('file:///photo.jpg', 'image/jpeg', 'photo.jpg');

    expect(mockedApiClient.post).toHaveBeenCalledTimes(1);
    const [url, body, config] = mockedApiClient.post.mock.calls[0];
    expect(url).toBe('/account/me/profile-image');
    expect(body).toBeInstanceOf(FormData);
    expect(config).toBeUndefined();
  });
});
