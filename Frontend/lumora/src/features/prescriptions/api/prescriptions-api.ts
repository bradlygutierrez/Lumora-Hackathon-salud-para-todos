import { httpClient } from '@/shared/api/http-client';

import type {
  CatalogPage,
  DetalleRecetaResponse,
  MedicamentoResponse,
  PatientRead,
  RecetaResponse,
} from '@/features/prescriptions/types/prescriptions.types';

/**
 * Servicio HTTP de Recetas y Medicamentos (A07).
 *
 * Todas las requests pasan por `httpClient`, que ya agrega el Bearer token
 * y maneja el refresh de sesión (ver shared/api/http-client.ts).
 */
export class PrescriptionsApiService {
  /**
   * GET /pacientes/me
   *
   * Resuelve el paciente_id del usuario logueado. Vive aquí porque, por
   * ahora, es la única feature que lo necesita; si otra feature (perfil,
   * citas) lo vuelve a necesitar, conviene moverlo a un shared/features
   * de "patients".
   */
  public getMyPatientProfile(): Promise<PatientRead> {
    return httpClient.get('/pacientes/me');
  }

  /** GET /prescriptions/patient/{paciente_id} */
  public getPrescriptionsByPatient(pacienteId: number): Promise<RecetaResponse[]> {
    return httpClient.get(`/prescriptions/patient/${pacienteId}`);
  }

  /** GET /prescriptions/{receta_id} */
  public getPrescription(recetaId: string): Promise<RecetaResponse> {
    return httpClient.get(`/prescriptions/${recetaId}`);
  }

  /** GET /prescriptions/{receta_id}/detalles */
  public getPrescriptionDetails(
    recetaId: string,
  ): Promise<DetalleRecetaResponse[]> {
    return httpClient.get(`/prescriptions/${recetaId}/detalles`);
  }

  /** GET /prescriptions/medications (catálogo de medicamentos). */
  public getMedications(): Promise<MedicamentoResponse[]> {
    return httpClient.get('/prescriptions/medications?limit=100');
  }

  /** GET /estados-receta */
  public getPrescriptionStatuses(): Promise<CatalogPage> {
    return httpClient.get('/estados-receta?limit=100');
  }

  /** GET /estados-dosis */
  public getDoseStatuses(): Promise<CatalogPage> {
    return httpClient.get('/estados-dosis?limit=100');
  }

  /** GET /origenes-registro */
  public getRecordOrigins(): Promise<CatalogPage> {
    return httpClient.get('/origenes-registro?limit=100');
  }

  /** GET /unidades-medida */
  public getMeasurementUnits(): Promise<CatalogPage> {
    return httpClient.get('/unidades-medida?limit=100');
  }

  /** GET /vias-administracion */
  public getAdministrationRoutes(): Promise<CatalogPage> {
    return httpClient.get('/vias-administracion?limit=100');
  }
}

/** Singleton usado por hooks y pantallas de la feature. */
export const prescriptionsApi = new PrescriptionsApiService();
