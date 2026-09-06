import type {
  MfaMethod,
  SessionRead,
  StaffSession,
  StaffUser,
} from '@/src/features/auth/types/auth.types';
import type { Page, Professional } from '@/src/features/profile/types/professional.types';
import type {
  CatalogItem as PatientCatalogItem,
  Page as PatientPage,
  Patient,
  PatientClinicalSummary,
  PatientDetail,
  PatientFamilyRelationship,
} from '@/src/features/patients/types/patient.types';

export const previewStaffUser: StaffUser = {
  id: 9001,
  email: 'sarah.jenkins@lumora.health',
  username: 'sarah.jenkins',
  activo: true,
  email_verificado: true,
  persona: {
    id: 8001,
    nombres: 'Dra. Sarah',
    apellidos: 'Jenkins',
    telefono: '+1 (555) 019-8234',
  },
  roles: [
    {
      id: 3001,
      nombre: 'Personal clinico preview',
      descripcion: 'Rol local para revisar pantallas sin usuario backend.',
      permisos: [
        { id: 4001, nombre: 'clinica:manage' },
        { id: 4002, nombre: 'consultas:create' },
        { id: 4003, nombre: 'rbac:manage' },
      ],
    },
  ],
};

export const previewSession: StaffSession = {
  accessToken: 'preview.access.token',
  refreshToken: 'preview-refresh-token',
  tokenType: 'bearer',
  isPreview: true,
  userId: previewStaffUser.id,
  user: previewStaffUser,
};

export const previewProfessionalsPage: Page<Professional> = {
  items: [
    {
      id: 101,
      especialidad: 'Cardiologia',
      numero_licencia: 'LM-2048',
      persona: previewStaffUser.persona,
    },
    {
      id: 102,
      especialidad: 'Neurologia',
      numero_licencia: 'LM-3177',
      persona: {
        id: 8002,
        nombres: 'Dr. Robert',
        apellidos: 'Chen',
        telefono: '+1 (555) 010-2244',
      },
    },
    {
      id: 103,
      especialidad: 'Pediatria',
      numero_licencia: 'NP-8841',
      persona: {
        id: 8003,
        nombres: 'Emily',
        apellidos: 'Davis',
        telefono: '+1 (555) 010-7788',
      },
    },
    {
      id: 104,
      especialidad: 'Cirugia',
      numero_licencia: 'LM-5521',
      persona: {
        id: 8004,
        nombres: 'Dr. Michael',
        apellidos: 'Chang',
        telefono: '+1 (555) 010-9230',
      },
    },
  ],
  total: 4,
  limit: 50,
  offset: 0,
};

export const previewSessions: SessionRead[] = [
  {
    id: 1,
    ip: '192.168.1.1',
    user_agent: 'macOS - Chrome (Sesion actual)',
    created_at: '2026-10-12T09:41:00.000Z',
    last_used_at: '2026-10-12T09:41:00.000Z',
    expires_at: '2026-10-12T17:41:00.000Z',
    device_name: 'MacBook Pro',
    platform: 'macOS',
    ip_address: '192.168.1.1',
    last_activity_at: '2026-10-12T09:41:00.000Z',
    is_current: true,
  },
  {
    id: 2,
    ip: '192.168.1.2',
    user_agent: 'iPhone 14 Pro - App',
    created_at: '2026-10-12T07:41:00.000Z',
    last_used_at: '2026-10-12T07:41:00.000Z',
    expires_at: '2026-10-12T15:41:00.000Z',
    device_name: 'iPhone 14 Pro',
    platform: 'iOS',
    ip_address: '192.168.1.2',
    last_activity_at: '2026-10-12T07:41:00.000Z',
    is_current: false,
  },
];

export const previewMfaMethods: MfaMethod[] = [
  {
    id: 1,
    metodo_id: 1,
    nombre: 'totp',
    activo: true,
  },
];


export const previewSexesPage: PatientPage<PatientCatalogItem> = {
  items: [
    { id: 1, nombre: 'Masculino' },
    { id: 2, nombre: 'Femenino' },
    { id: 3, nombre: 'Otro' },
  ],
  total: 3,
  limit: 100,
  offset: 0,
};

export const previewBloodTypesPage: PatientPage<PatientCatalogItem> = {
  items: [
    { id: 1, nombre: 'O+' },
    { id: 2, nombre: 'A+' },
    { id: 3, nombre: 'B+' },
    { id: 4, nombre: 'AB+' },
  ],
  total: 4,
  limit: 100,
  offset: 0,
};

const previewPatients: Patient[] = [
  {
    id: 101,
    tipo_sangre_id: 1,
    alergias: 'Penicilina',
    persona: {
      id: 8101,
      nombres: 'Ana',
      apellidos: 'Morales',
      fecha_nacimiento: '1988-06-14',
      telefono: '8888-1201',
      email: 'ana.morales@example.com',
      sexo_id: 2,
      direcciones: [
        {
          id: 7101,
          linea_1: 'Reparto San Juan, casa 18',
          ciudad: 'Managua',
          departamento: 'Managua',
          pais: 'Nicaragua',
          codigo_postal: null,
          es_principal: true,
        },
      ],
    },
  },
  {
    id: 102,
    tipo_sangre_id: 2,
    alergias: null,
    persona: {
      id: 8102,
      nombres: 'Carlos',
      apellidos: 'Gutiérrez',
      fecha_nacimiento: '1979-11-02',
      telefono: '8888-1202',
      email: 'carlos.gutierrez@example.com',
      sexo_id: 1,
      direcciones: [
        {
          id: 7102,
          linea_1: 'Las Colinas, calle 4',
          ciudad: 'Managua',
          departamento: 'Managua',
          pais: 'Nicaragua',
          codigo_postal: null,
          es_principal: true,
        },
      ],
    },
  },
  {
    id: 103,
    tipo_sangre_id: 3,
    alergias: 'Mariscos',
    persona: {
      id: 8103,
      nombres: 'María',
      apellidos: 'López',
      fecha_nacimiento: '1995-03-25',
      telefono: '8888-1203',
      email: 'maria.lopez@example.com',
      sexo_id: 2,
      direcciones: [
        {
          id: 7103,
          linea_1: 'Villa Fontana, bloque B',
          ciudad: 'Managua',
          departamento: 'Managua',
          pais: 'Nicaragua',
          codigo_postal: null,
          es_principal: true,
        },
      ],
    },
  },
];

export const previewPatientsPage: PatientPage<Patient> = {
  items: previewPatients,
  total: previewPatients.length,
  limit: 10,
  offset: 0,
};

export const previewPatientDetails: Record<number, PatientDetail> = {
  101: {
    ...previewPatients[0],
    contactos_emergencia: [
      {
        id: 501,
        paciente_id: 101,
        nombre: 'Roberto Morales',
        parentesco: 'Hermano',
        telefono: '8888-5001',
        email: 'roberto.morales@example.com',
      },
    ],
  },
  102: {
    ...previewPatients[1],
    contactos_emergencia: [
      {
        id: 502,
        paciente_id: 102,
        nombre: 'Lucía Gutiérrez',
        parentesco: 'Esposa',
        telefono: '8888-5002',
        email: null,
      },
    ],
  },
  103: {
    ...previewPatients[2],
    contactos_emergencia: [],
  },
};

export const previewPatientFamilies: Record<number, PatientFamilyRelationship[]> = {
  101: [
    {
      id: 601,
      usuario_relacionado_id: 9201,
      nombres: 'Valeria',
      apellidos: 'Morales',
      tipo_relacion_id: 2,
      tipo_relacion: 'Hija',
      recibir_notificaciones: true,
      estado: 'active',
      nivel_acceso: 'read',
      expira_en: null,
    },
  ],
  102: [],
  103: [],
};

export const previewPatientSummaries: Record<number, PatientClinicalSummary> = {
  101: {
    paciente_id: 101,
    expediente: {
      id: 7001,
      paciente_id: 101,
      estado_expediente_id: 1,
      numero_expediente: 'LM-2026-0101',
      notas: 'Expediente de demostración para revisión visual.',
      activo: true,
    },
  },
  102: {
    paciente_id: 102,
    expediente: {
      id: 7002,
      paciente_id: 102,
      estado_expediente_id: 1,
      numero_expediente: 'LM-2026-0102',
      notas: null,
      activo: true,
    },
  },
  103: { paciente_id: 103, expediente: null },
};
