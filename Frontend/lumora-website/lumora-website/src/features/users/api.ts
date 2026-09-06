import { ApiError, apiClient, type ApiClient } from '../../shared/api/client'
import type { StaffUser, StaffUserCreatePayload, UserPage } from './types'

export class UsersApi {
  private readonly client: ApiClient
  constructor(client: ApiClient = apiClient) { this.client = client }
  listAll(): Promise<UserPage> {
    return this.client.request<UserPage>('/usuarios?limit=100')
  }

  async list(): Promise<UserPage> {
    try {
      return await this.client.request<UserPage>('/usuarios/admins?limit=100')
    } catch (error) {
      if (!(error instanceof ApiError) || ![404, 422].includes(error.status)) throw error
      const page = await this.client.request<UserPage>('/usuarios?limit=100')
      const items = page.items.filter((user) => user.roles.some((role) => role.nombre === 'Administrador'))
      return { ...page, items, total: items.length }
    }
  }
  createAdmin(data: StaffUserCreatePayload): Promise<StaffUser> {
    return this.client.request<StaffUser>('/usuarios/admin', { method: 'POST', body: JSON.stringify(data) })
  }
  resendPasswordReset(userId: number): Promise<{ message: string }> {
    return this.client.request<{ message: string }>(`/usuarios/${userId}/password-reset`, { method: 'POST' })
  }
}
