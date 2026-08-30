import type { Professional } from '@/src/features/profile/types/professional.types';
import type { Page } from '@/src/shared/types/clinical';

export type { Page };

export type PrescriptionCatalogItem = {
  id: number;
  nombre: string;
  activo?: boolean;
};

export type Medication = {
  id: string;
  nombre: string;
  nombre_generico: string | null;
  presentacion: string | null;
  concentracion: string | null;
  fabricante: string | null;
  activo: boolean;
  created_at: string;
};

export type PrescriptionDetail = {
  id: string;
  receta_id: string;
  medicamento_id: string;
  unidad_medida_id: number;
  via_administracion_id: number;
  dosis: string;
  frecuencia: string;
  duracion_dias: number;
  cantidad_total: number;
  instrucciones: string | null;
};

export type PrescriptionDetailCreate = {
  medicamento_id: string;
  unidad_medida_id: number;
  via_administracion_id: number;
  dosis: string;
  frecuencia: string;
  duracion_dias: number;
  cantidad_total: number;
  instrucciones?: string | null;
};

export type PrescriptionDetailUpdate = Partial<PrescriptionDetailCreate>;

export type PrescriptionCreate = {
  paciente_id: number;
  profesional_id: number;
  consulta_id?: number | null;
  estado_id: number;
  titulo?: string | null;
  vigencia_hasta?: string | null;
  observaciones?: string | null;
  detalles: PrescriptionDetailCreate[];
};

export type PrescriptionUpdate = {
  estado_id?: number;
  titulo?: string | null;
  vigencia_hasta?: string | null;
  observaciones?: string | null;
};

export type Prescription = {
  id: string;
  paciente_id: number;
  profesional_id: number;
  consulta_id: number | null;
  estado_id: number;
  titulo: string | null;
  fecha_emision: string;
  vigencia_hasta: string | null;
  observaciones: string | null;
  created_at: string;
  detalles: PrescriptionDetail[];
  profesional: Professional;
};
