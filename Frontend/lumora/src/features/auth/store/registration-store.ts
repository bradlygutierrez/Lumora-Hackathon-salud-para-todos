import { create } from 'zustand';

import type {
  RegisterAccountForm,
  RegisterEmergencyForm,
  RegisterPersonalForm,
} from '@/features/auth/schemas/auth.schemas';
import type { PatientRegistrationRequest } from '@/features/auth/types/auth.types';

type RegistrationState = {
  account: RegisterAccountForm | null;
  personal: RegisterPersonalForm | null;
  emergency: RegisterEmergencyForm | null;

  setAccount: (value: RegisterAccountForm) => void;
  setPersonal: (value: RegisterPersonalForm) => void;
  setEmergency: (value: RegisterEmergencyForm) => void;

  /** Construye exactamente el DTO de POST /auth/register. */
  buildRequest: (
    acceptTerms: true,
    acceptPrivacy: true,
  ) => PatientRegistrationRequest;

  reset: () => void;
};

/**
 * Estado temporal del registro multipaso.
 *
 * En React web podríamos resolverlo con un `RegistrationContext` alrededor de
 * las cuatro rutas. Zustand evita ese provider y mantiene los datos mientras
 * el usuario avanza/retrocede entre pasos.
 *
 * Este store NO se persiste: contiene contraseña y datos personales aún no
 * enviados. Al cerrar la app se descartan deliberadamente.
 */
export const useRegistrationStore = create<RegistrationState>((set, get) => ({
  account: null,
  personal: null,
  emergency: null,

  setAccount: (account) => set({ account }),
  setPersonal: (personal) => set({ personal }),
  setEmergency: (emergency) => set({ emergency }),

  buildRequest: (acceptTerms, acceptPrivacy) => {
    const { account, personal, emergency } = get();

    if (!account || !personal || !emergency) {
      throw new Error('El registro está incompleto.');
    }

    return {
      username: account.username.trim().toLowerCase(),
      email: account.email.trim().toLowerCase(),
      password: account.password,
      phone: account.phone.trim(),

      first_names: personal.firstNames.trim(),
      last_names: personal.lastNames.trim(),
      birth_date: personal.birthDate,
      sex_id: personal.sexId,
      blood_type_id: personal.bloodTypeId,

      address: {
        line_1: personal.addressLine1.trim(),
        city: personal.city.trim(),
        department: personal.department.trim() || null,
        country: personal.country.trim(),
        postal_code: personal.postalCode.trim() || null,
      },

      emergency_contact: {
        name: emergency.name.trim(),
        relationship: emergency.relationship.trim(),
        phone: emergency.phone.trim(),
      },

      accept_terms: acceptTerms,
      accept_privacy: acceptPrivacy,
    };
  },

  reset: () => {
    set({
      account: null,
      personal: null,
      emergency: null,
    });
  },
}));
