export type RelacionEstado = 'pending' | 'active' | 'revoked' | 'inactive' | 'rejected';

export type NivelAcceso = 'read' | 'write';

export type UsuarioRelacionadoSummary = {
  id: number;
  full_name: string;
  email: string;
};

export type TipoRelacionSummary = {
  id: number;
  nombre: string;
};

export type RelacionPacienteResponse = {
  id: number;
  paciente_id: number;
  usuario_relacionado_id: number;
  tipo_relacion_id: number;
  recibir_notificaciones: boolean;
  activo: boolean;
  estado: RelacionEstado;
  nivel_acceso: NivelAcceso;
  expira_en: string | null;
  creado_en: string;
  usuario_relacionado: UsuarioRelacionadoSummary | null;
  tipo_relacion: TipoRelacionSummary | null;
};

export type RelacionPacienteUpdateInput = {
  nivel_acceso?: NivelAcceso;
  recibir_notificaciones?: boolean;
  estado?: RelacionEstado;
};
