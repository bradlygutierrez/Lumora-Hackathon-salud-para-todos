export type AccountAddress = {
  id: number;
  line_1: string;
  city: string;
  department: string | null;
  country: string;
  postal_code: string | null;
  is_primary: boolean;
};

export type AccountProfile = {
  id: number;
  username: string;
  email: string;
  email_verified: boolean;
  profile_image_url: string | null;
  person: {
    id: number;
    first_names: string;
    last_names: string;
    birth_date: string | null;
    phone: string | null;
    email: string | null;
    sex_id: number | null;
    addresses: AccountAddress[];
  };
  roles: { id: number; name: string }[];
};

export type AccountUpdateRequest = {
  username?: string;
  email?: string;
  person?: {
    first_names?: string;
    last_names?: string;
    birth_date?: string | null;
    phone?: string | null;
    sex_id?: number | null;
  };
};

export type ProfileImageResponse = {
  profile_image_url: string | null;
};

export type EmergencyContact = {
  id: number;
  paciente_id: number;
  nombre: string;
  parentesco: string;
  telefono: string;
  email: string | null;
};

export type EmergencyContactPage = {
  items: EmergencyContact[];
  total: number;
  limit: number;
  offset: number;
};

export type EmergencyContactUpdate = {
  nombre: string;
  parentesco: string;
  telefono: string;
  email: string | null;
};
