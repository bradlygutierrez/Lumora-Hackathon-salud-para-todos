import type {
  MfaMethod,
  SessionRead,
  StaffSession,
  StaffUser,
} from '@/src/features/auth/types/auth.types';
import type { Page, Professional } from '@/src/features/profile/types/professional.types';

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
  },
  {
    id: 2,
    ip: '192.168.1.2',
    user_agent: 'iPhone 14 Pro - App',
    created_at: '2026-10-12T07:41:00.000Z',
    last_used_at: '2026-10-12T07:41:00.000Z',
    expires_at: '2026-10-12T15:41:00.000Z',
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
