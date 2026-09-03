import { apiClient, type ApiClient } from '../../shared/api/client'
import type { StaffUser, StaffUserCreatePayload, UserPage } from './types'

export class UsersApi {
  private readonly client: ApiClient
  constructor(client: ApiClient = apiClient) { this.client = client }
  list(): Promise<UserPage> { return this.client.request<UserPage>('/usuarios/admins?limit=100') }
  createAdmin(data: StaffUserCreatePayload): Promise<StaffUser> {
    return this.client.request<StaffUser>('/usuarios/admin', { method: 'POST', body: JSON.stringify(data) })
  }
  resendPasswordReset(userId: number): Promise<{ message: string }> {
    return this.client.request<{ message: string }>(`/usuarios/${userId}/password-reset`, { method: 'POST' })
  }
}
