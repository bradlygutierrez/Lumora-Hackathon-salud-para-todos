import { apiClient } from '@/src/shared/api/client';
import {
  getMedicalRecordDocument,
  getMedicalRecordDocumentPdf,
} from '../api/medical-record-document.api';

jest.mock('@/src/shared/api/client', () => ({
  apiClient: { get: jest.fn() },
}));

const mockGet = apiClient.get as jest.Mock;

describe('medical record document API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the canonical B15 document for a patient', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        generated_at: '2026-08-31T12:00:00Z',
        paciente: { id: 9, nombres: 'Ana', apellidos: 'Segura' },
      },
    });

    await getMedicalRecordDocument(9);

    expect(mockGet).toHaveBeenCalledWith(
      '/patients/9/medical-record-document',
    );
  });

  it('downloads the authenticated PDF as bytes and keeps the backend filename', async () => {
    const data = new Uint8Array([37, 80, 68, 70]).buffer;
    mockGet.mockResolvedValueOnce({
      data,
      headers: {
        'content-disposition':
          'attachment; filename="lumora-expediente-9-20260831.pdf"',
      },
    });

    const result = await getMedicalRecordDocumentPdf(9);

    expect(mockGet).toHaveBeenCalledWith(
      '/patients/9/medical-record-document/pdf',
      { responseType: 'arraybuffer' },
    );
    expect(Array.from(result.bytes)).toEqual([37, 80, 68, 70]);
    expect(result.filename).toBe('lumora-expediente-9-20260831.pdf');
  });

  it('falls back to a safe filename when the response header is absent', async () => {
    mockGet.mockResolvedValueOnce({
      data: new Uint8Array([37, 80, 68, 70]).buffer,
      headers: {},
    });

    const result = await getMedicalRecordDocumentPdf(12);

    expect(result.filename).toBe('lumora-expediente-12.pdf');
  });
});
