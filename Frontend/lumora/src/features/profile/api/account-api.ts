import type {
  AccountProfile,
  AccountUpdateRequest,
  EmergencyContact,
  EmergencyContactPage,
  EmergencyContactUpdate,
  ProfileImageResponse,
} from '@/features/profile/types/account.types';
import { httpClient } from '@/shared/api/http-client';

export class AccountApiService {
  public getMe(): Promise<AccountProfile> {
    return httpClient.get('/account/me');
  }

  public updateMe(data: AccountUpdateRequest): Promise<AccountProfile> {
    return httpClient.patch('/account/me', data);
  }

  public uploadProfileImage(
    uri: string,
    mimeType: string,
    fileName: string,
  ): Promise<ProfileImageResponse> {
    const body = new FormData();
    body.append('file', { uri, type: mimeType, name: fileName } as unknown as Blob);
    return httpClient.post('/account/me/profile-image', body);
  }

  public deleteProfileImage(): Promise<ProfileImageResponse> {
    return httpClient.delete('/account/me/profile-image');
  }

  public getEmergencyContacts(patientId: number): Promise<EmergencyContactPage> {
    return httpClient.get(`/pacientes/${patientId}/contactos-emergencia`, {
      params: { limit: 100, offset: 0 },
    });
  }

  public createEmergencyContact(
    patientId: number,
    data: EmergencyContactUpdate,
  ): Promise<EmergencyContact> {
    return httpClient.post(`/pacientes/${patientId}/contactos-emergencia`, data);
  }

  public updateEmergencyContact(
    patientId: number,
    contactId: number,
    data: EmergencyContactUpdate,
  ): Promise<EmergencyContact> {
    return httpClient.patch(
      `/pacientes/${patientId}/contactos-emergencia/${contactId}`,
      data,
    );
  }
}

export const accountApi = new AccountApiService();
