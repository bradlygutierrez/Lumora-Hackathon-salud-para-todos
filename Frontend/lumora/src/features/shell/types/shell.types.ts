export type LumoraRole =
  | 'patient'
  | 'caregiver'
  | 'dual'
  | 'unsupported';

export type SelectableLumoraRole =
  | 'patient'
  | 'caregiver';

export type ApiRole = {
  id: number;
  nombre: string;
};

export type PersonSummary = {
  id: number;
  nombres: string;
  apellidos: string;
};

export type CurrentUser = {
  id: number;
  email: string;
  username: string;
  activo: boolean;
  email_verificado: boolean;
  persona: PersonSummary;
  roles: ApiRole[];
};

export type PatientSummary = {
  id: number;
  persona: PersonSummary;
};

export type PaginatedPatients = {
  items: PatientSummary[];
  total: number;
  limit: number;
  offset: number;
};

export type CaregiverPatientLink = {
  patient_id: number;
  relationship: string | null;
  status: string;
  access_level: string | null;
  patient: {
    id: number;
    first_names: string;
    last_names: string;
  };
};

export type PatientContext = {
  patientId: number;
  displayName: string;
  relationship: string | null;
  accessLevel: string | null;
};

export type ShellIdentity = {
  user: CurrentUser;
  role: LumoraRole;
  availablePatients: PatientContext[];
};
