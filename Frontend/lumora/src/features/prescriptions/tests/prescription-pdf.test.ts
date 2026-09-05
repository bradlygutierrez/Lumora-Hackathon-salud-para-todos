// expo-file-system y expo-sharing todavia no estan instalados en este
// proyecto (ver package.json) -- se mockean como modulos "virtuales" para
// poder probar la logica propia sin depender de tenerlos ya instalados.
// Una vez instalados (`npx expo install expo-file-system expo-sharing`)
// estos mocks siguen funcionando igual.
jest.mock(
  'expo-file-system/legacy',
  () => ({
    documentDirectory: 'file:///docs/',
    downloadAsync: jest.fn(),
  }),
  { virtual: true },
);

jest.mock(
  'expo-sharing',
  () => ({
    isAvailableAsync: jest.fn(),
    shareAsync: jest.fn(),
  }),
  { virtual: true },
);

jest.mock('@/shared/api/secure-session', () => ({
  secureSession: {
    get: jest.fn(),
  },
}));

jest.mock('@/config/env', () => ({
  env: {
    apiUrl: 'https://api.test',
    apiV1Url: 'https://api.test/api/v1',
  },
}));

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import {
  downloadPrescriptionPdf,
  PrescriptionPdfUnavailableError,
  sharePrescriptionPdf,
} from '@/features/prescriptions/utils/prescription-pdf';
import { secureSession } from '@/shared/api/secure-session';

const mockDownloadAsync = FileSystem.downloadAsync as jest.Mock;
const mockIsAvailableAsync = Sharing.isAvailableAsync as jest.Mock;
const mockShareAsync = Sharing.shareAsync as jest.Mock;
const mockSessionGet = secureSession.get as jest.Mock;

describe('downloadPrescriptionPdf', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('downloads the PDF with an authenticated request to the expected path', async () => {
    mockSessionGet.mockResolvedValue({ accessToken: 'token-123', refreshToken: 'r-1' });
    mockDownloadAsync.mockResolvedValue({ status: 200, uri: 'file:///docs/receta-rx-1.pdf' });

    const uri = await downloadPrescriptionPdf('rx-1');

    expect(mockDownloadAsync).toHaveBeenCalledWith(
      'https://api.test/api/v1/prescriptions/rx-1/pdf',
      'file:///docs/receta-rx-1.pdf',
      { headers: { Authorization: 'Bearer token-123' } },
    );
    expect(uri).toBe('file:///docs/receta-rx-1.pdf');
  });

  it('throws PrescriptionPdfUnavailableError when there is no active session', async () => {
    mockSessionGet.mockResolvedValue(null);

    await expect(downloadPrescriptionPdf('rx-1')).rejects.toBeInstanceOf(
      PrescriptionPdfUnavailableError,
    );
    expect(mockDownloadAsync).not.toHaveBeenCalled();
  });

  it('throws PrescriptionPdfUnavailableError when the download fails', async () => {
    mockSessionGet.mockResolvedValue({ accessToken: 'token-123', refreshToken: 'r-1' });
    mockDownloadAsync.mockResolvedValue({ status: 403, uri: '' });

    await expect(downloadPrescriptionPdf('rx-1')).rejects.toBeInstanceOf(
      PrescriptionPdfUnavailableError,
    );
  });
});

describe('sharePrescriptionPdf', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('downloads and opens the native share dialog when sharing is available', async () => {
    mockIsAvailableAsync.mockResolvedValue(true);
    mockSessionGet.mockResolvedValue({ accessToken: 'token-123', refreshToken: 'r-1' });
    mockDownloadAsync.mockResolvedValue({ status: 200, uri: 'file:///docs/receta-rx-1.pdf' });

    await sharePrescriptionPdf('rx-1');

    expect(mockShareAsync).toHaveBeenCalledWith(
      'file:///docs/receta-rx-1.pdf',
      expect.objectContaining({ mimeType: 'application/pdf' }),
    );
  });

  it('throws PrescriptionPdfUnavailableError when the device cannot share, without downloading', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);

    await expect(sharePrescriptionPdf('rx-1')).rejects.toBeInstanceOf(
      PrescriptionPdfUnavailableError,
    );
    expect(mockDownloadAsync).not.toHaveBeenCalled();
  });
});
