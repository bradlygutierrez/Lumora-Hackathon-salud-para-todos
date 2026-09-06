import { create } from 'zustand';

import type {
  RegisterAccountForm,
  RegisterEmergencyForm,
  RegisterPersonalForm,
} from '@/features/auth/schemas/auth.schemas';
import type {
  CaregiverRegistrationRequest,
  PatientRegistrationRequest,
  RegistrationIdentityRequest,
} from '@/features/auth/types/auth.types';

export type RegistrationAccountType =
  | 'patient'
  | 'caregiver';

type RegistrationState = {
  accountType: RegistrationAccountType | null;
  account: RegisterAccountForm | null;
  personal: RegisterPersonalForm | null;
  emergency: RegisterEmergencyForm | null;

  setAccountType: (value: RegistrationAccountType) => void;
  setAccount: (value: RegisterAccountForm) => void;
  setPersonal: (value: RegisterPersonalForm) => void;
  setEmergency: (value: RegisterEmergencyForm) => void;

  /**
   * Alias histórico de POST /auth/register.
   * Se mantiene para no romper consumidores/tests B08 existentes.
   */
  buildRequest: (
    acceptTerms: true,
    acceptPrivacy: true,
  ) => PatientRegistrationRequest;

  buildPatientRequest: (
    acceptTerms: true,
    acceptPrivacy: true,
  ) => PatientRegistrationRequest;

  buildCaregiverRequest: (
    acceptTerms: true,
    acceptPrivacy: true,
  ) => CaregiverRegistrationRequest;

  reset: () => void;
};

function buildIdentityRequest(
  account: RegisterAccountForm,
  personal: RegisterPersonalForm,
  acceptTerms: true,
  acceptPrivacy: true,
): RegistrationIdentityRequest {
  return {
    username: account.username.trim().toLowerCase(),
    email: account.email.trim().toLowerCase(),
    password: account.password,
    phone: account.phone.trim(),

    first_names: personal.firstNames.trim(),
    last_names: personal.lastNames.trim(),
    birth_date: personal.birthDate,
    sex_id: personal.sexId,

    address: {
      line_1: personal.addressLine1.trim(),
      city: personal.city.trim(),
      department: personal.department.trim() || null,
      country: personal.country.trim(),
      postal_code: personal.postalCode.trim() || null,
    },

    accept_terms: acceptTerms,
    accept_privacy: acceptPrivacy,
  };
}

/**
 * Estado temporal del registro.
 *
 * No se persiste deliberadamente porque contiene contraseña y datos
 * personales todavía no enviados.
 */
export const useRegistrationStore = create<RegistrationState>((set, get) => ({
  accountType: null,
  account: null,
  personal: null,
  emergency: null,

  setAccountType: (accountType) => set({
    accountType,
    account: null,
    personal: null,
    emergency: null,
  }),
  setAccount: (account) => set({ account }),
  setPersonal: (personal) => set({ personal }),
  setEmergency: (emergency) => set({ emergency }),

  buildRequest: (acceptTerms, acceptPrivacy) => {
    const { account, personal, emergency } = get();

    if (!account || !personal || !emergency) {
      throw new Error('El registro de paciente está incompleto.');
    }

    return {
      ...buildIdentityRequest(
        account,
        personal,
        acceptTerms,
        acceptPrivacy,
      ),
      blood_type_id: personal.bloodTypeId,
      emergency_contact: {
        name: emergency.name.trim(),
        relationship: emergency.relationship.trim(),
        phone: emergency.phone.trim(),
      },
    };
  },

  buildPatientRequest: (acceptTerms, acceptPrivacy) =>
    get().buildRequest(acceptTerms, acceptPrivacy),

  buildCaregiverRequest: (acceptTerms, acceptPrivacy) => {
    const { account, personal } = get();

    if (!account || !personal) {
      throw new Error('El registro de cuidador está incompleto.');
    }

    return buildIdentityRequest(
      account,
      personal,
      acceptTerms,
      acceptPrivacy,
    );
  },

  reset: () => {
    set({
      accountType: null,
      account: null,
      personal: null,
      emergency: null,
    });
  },
}));
