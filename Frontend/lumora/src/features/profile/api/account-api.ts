import type {
  AccountProfile,
  AccountUpdateRequest,
  EmergencyContact,
  EmergencyContactPage,
  EmergencyContactUpdate,
  ProfileImageResponse,
} from '@/features/profile/types/account.types';
import type { CurrentUser } from '@/features/shell/types/shell.types';
import { httpClient } from '@/shared/api/http-client';

export class AccountApiService {
  public async getMe(): Promise<AccountProfile> {
    try {
      return await httpClient.get('/account/me');
    } catch {
      const user = await httpClient.get<CurrentUser>('/auth/me');

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        email_verified: user.email_verificado,
        profile_image_url: null,
        person: {
          id: user.persona.id,
          first_names: user.persona.nombres,
          last_names: user.persona.apellidos,
          birth_date: null,
          phone: null,
          email: user.email,
          sex_id: null,
          addresses: [],
        },
        roles: user.roles.map((role) => ({ id: role.id, name: role.nombre })),
      };
    }
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
