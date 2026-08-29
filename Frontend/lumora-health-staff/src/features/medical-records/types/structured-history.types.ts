import type { Page } from '@/src/shared/types/clinical';

export type { Page };

export type CatalogItem = {
  id: number;
  nombre: string;
  activo?: boolean;
};

export type ClinicalListParams = {
  limit?: number;
  offset?: number;
  activo?: boolean;
};

export type CatalogListParams = {
  limit?: number;
  offset?: number;
  activo?: boolean;
};

export type Condition = {
  id: number;
  expediente_id: number;
  paciente_id: number;
  diagnostico_id: number | null;
  estado_condicion_id: number;
  nombre: string;
  descripcion: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  activo: boolean;
};

export type ConditionCreate = {
  estado_condicion_id: number;
  nombre: string;
  descripcion?: string | null;
  diagnostico_id?: number | null;
  fecha_inicio?: string | null;
  motivo_historial?: string | null;
  activo?: boolean;
};

export type ConditionUpdate = {
  estado_condicion_id?: number | null;
  nombre?: string | null;
  descripcion?: string | null;
  diagnostico_id?: number | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  activo?: boolean | null;
  motivo_historial?: string | null;
};

export type ConditionHistory = {
  id: number;
  condicion_id: number;
  estado_anterior_id: number | null;
  estado_nuevo_id: number | null;
  accion: string;
  motivo: string | null;
  usuario_id: number;
  created_at: string;
};

export type Allergy = {
  id: number;
  paciente_id: number;
  nombre: string;
  nivel_severidad_id: number | null;
  estado_condicion_id: number | null;
  observaciones: string | null;
  activo: boolean;
};

export type AllergyCreate = {
  nombre: string;
  nivel_severidad_id?: number | null;
  estado_condicion_id?: number | null;
  observaciones?: string | null;
  activo?: boolean;
};

export type AllergyUpdate = {
  nombre?: string | null;
  nivel_severidad_id?: number | null;
  estado_condicion_id?: number | null;
  observaciones?: string | null;
  activo?: boolean | null;
};

export type Disability = {
  id: number;
  paciente_id: number;
  nombre: string;
  estado_condicion_id: number | null;
  observaciones: string | null;
  activo: boolean;
};

export type DisabilityCreate = {
  nombre: string;
  estado_condicion_id?: number | null;
  observaciones?: string | null;
  activo?: boolean;
};

export type DisabilityUpdate = {
  nombre?: string | null;
  estado_condicion_id?: number | null;
  observaciones?: string | null;
  activo?: boolean | null;
};

export type MedicalHistoryEntry = {
  id: number;
  expediente_id: number;
  tipo_antecedente_id: number;
  descripcion: string;
  fecha: string | null;
  activo: boolean;
};

export type MedicalHistoryCreate = {
  tipo_antecedente_id: number;
  descripcion: string;
  fecha?: string | null;
  activo?: boolean;
};

export type MedicalHistoryUpdate = {
  tipo_antecedente_id?: number | null;
  descripcion?: string | null;
  fecha?: string | null;
  activo?: boolean | null;
};

export type StructuredSection = 'conditions' | 'allergies' | 'disabilities' | 'history';
