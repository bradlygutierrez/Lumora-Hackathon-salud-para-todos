import type { ClinicalDiagnosis } from '@/src/features/medical-records/types/medical-record.types';
import type { Page } from '@/src/shared/types/clinical';

export type Diagnosis = ClinicalDiagnosis;
export type { Page };

export type DiagnosisCreate = {
  tipo_diagnostico_id: number;
  descripcion: string;
  es_principal?: boolean;
  fecha_diagnostico?: string;
  activo?: boolean;
};

export type DiagnosisUpdate = {
  tipo_diagnostico_id?: number;
  descripcion?: string;
  es_principal?: boolean;
  fecha_diagnostico?: string;
  activo?: boolean;
};

export type DiagnosisListParams = {
  limit?: number;
  offset?: number;
};

export type DiagnosisTypeCatalogItem = {
  id: number;
  nombre: string;
  activo: boolean;
};
