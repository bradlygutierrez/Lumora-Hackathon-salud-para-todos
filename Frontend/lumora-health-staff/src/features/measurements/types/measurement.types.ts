export type HealthIndicator = {
  id: string;
  codigo: string;
  nombre: string;
  unidad_medida_id: number;
  descripcion: string | null;
  activo: boolean;
  created_at: string;
};

export type PatientMeasurement = {
  id: string;
  paciente_id: number;
  indicador_id: string;
  valor: number;
  unidad_medida_id: number;
  origen_registro_id: number;
  registrado_por_id: number;
  fecha_medicion: string;
  observaciones: string | null;
};

export type CatalogItem = {
  id: number;
  nombre: string;
};

export type CatalogPage = {
  items: CatalogItem[];
  total: number;
  limit: number;
  offset: number;
};
