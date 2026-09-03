import { apiClient, type ApiClient } from '../../shared/api/client'
import type {
  Affiliation,
  AffiliationCreatePayload,
  AffiliationProfessional,
  AffiliationUpdatePayload,
  ProfessionalProvisionPayload,
  ProvisionedProfessional,
} from './types'

export class AffiliationsApi {
  private readonly client: ApiClient

  constructor(client: ApiClient = apiClient) {
    this.client = client
  }

  list(): Promise<Affiliation[]> {
    return this.client.request<Affiliation[]>('/medical-affiliations')
  }

  get(id: number): Promise<Affiliation> {
    return this.client.request<Affiliation>(`/medical-affiliations/${id}`)
  }

  create(data: AffiliationCreatePayload): Promise<Affiliation> {
    return this.client.request<Affiliation>('/medical-affiliations', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  update(id: number, data: AffiliationUpdatePayload): Promise<Affiliation> {
    return this.client.request<Affiliation>(`/medical-affiliations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  professionals(id: number): Promise<AffiliationProfessional[]> {
    return this.client.request<AffiliationProfessional[]>(`/medical-affiliations/${id}/professionals`)
  }

  provision(id: number, data: ProfessionalProvisionPayload): Promise<ProvisionedProfessional> {
    return this.client.request<ProvisionedProfessional>(`/medical-affiliations/${id}/professionals`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  updateMembership(affiliationId: number, professionalId: number, active: boolean): Promise<void> {
    return this.client.request<void>(`/medical-affiliations/${affiliationId}/professionals/${professionalId}`, {
      method: 'PATCH',
      body: JSON.stringify({ activo: active }),
    })
  }

  verifyLicense(professionalId: number, verified: boolean): Promise<void> {
    return this.client.request<void>(`/medical-affiliations/professionals/${professionalId}/license`, {
      method: 'PATCH',
      body: JSON.stringify({ licencia_verificada: verified }),
    })
  }
}
