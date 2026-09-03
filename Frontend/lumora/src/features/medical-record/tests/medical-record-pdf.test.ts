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
  downloadMedicalRecordPdf,
  MedicalRecordPdfUnavailableError,
  shareMedicalRecordPdf,
} from '@/features/medical-record/utils/medical-record-pdf';
import { secureSession } from '@/shared/api/secure-session';

const mockDownloadAsync = FileSystem.downloadAsync as jest.Mock;
const mockIsAvailableAsync = Sharing.isAvailableAsync as jest.Mock;
const mockShareAsync = Sharing.shareAsync as jest.Mock;
const mockSessionGet = secureSession.get as jest.Mock;

describe('downloadMedicalRecordPdf', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('downloads the PDF with an authenticated request to the expected path', async () => {
    mockSessionGet.mockResolvedValue({ accessToken: 'token-123', refreshToken: 'r-1' });
    mockDownloadAsync.mockResolvedValue({ status: 200, uri: 'file:///docs/expediente-medico-6.pdf' });

    const uri = await downloadMedicalRecordPdf(6);

    expect(mockDownloadAsync).toHaveBeenCalledWith(
      'https://api.test/api/v1/patients/6/medical-record/pdf',
      'file:///docs/expediente-medico-6.pdf',
      { headers: { Authorization: 'Bearer token-123' } },
    );
    expect(uri).toBe('file:///docs/expediente-medico-6.pdf');
  });

  it('throws MedicalRecordPdfUnavailableError when there is no active session', async () => {
    mockSessionGet.mockResolvedValue(null);

    await expect(downloadMedicalRecordPdf(6)).rejects.toBeInstanceOf(
      MedicalRecordPdfUnavailableError,
    );
    expect(mockDownloadAsync).not.toHaveBeenCalled();
  });

  it('throws MedicalRecordPdfUnavailableError when the download fails', async () => {
    mockSessionGet.mockResolvedValue({ accessToken: 'token-123', refreshToken: 'r-1' });
    mockDownloadAsync.mockResolvedValue({ status: 403, uri: '' });

    await expect(downloadMedicalRecordPdf(6)).rejects.toBeInstanceOf(
      MedicalRecordPdfUnavailableError,
    );
  });
});

describe('shareMedicalRecordPdf', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('downloads and opens the native share dialog when sharing is available', async () => {
    mockIsAvailableAsync.mockResolvedValue(true);
    mockSessionGet.mockResolvedValue({ accessToken: 'token-123', refreshToken: 'r-1' });
    mockDownloadAsync.mockResolvedValue({ status: 200, uri: 'file:///docs/expediente-medico-6.pdf' });

    await shareMedicalRecordPdf(6);

    expect(mockShareAsync).toHaveBeenCalledWith(
      'file:///docs/expediente-medico-6.pdf',
      expect.objectContaining({ mimeType: 'application/pdf' }),
    );
  });

  it('throws MedicalRecordPdfUnavailableError when the device cannot share, without downloading', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);

    await expect(shareMedicalRecordPdf(6)).rejects.toBeInstanceOf(
      MedicalRecordPdfUnavailableError,
    );
    expect(mockDownloadAsync).not.toHaveBeenCalled();
  });
});
