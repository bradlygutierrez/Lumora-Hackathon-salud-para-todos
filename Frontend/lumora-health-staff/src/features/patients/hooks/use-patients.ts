import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { queryKeys } from '@/src/shared/api/query-keys';
import {
  previewBloodTypesPage,
  previewPatientDetails,
  previewPatientFamilies,
  previewPatientSummaries,
  previewPatientsPage,
  previewSexesPage,
} from '@/src/shared/preview/health-staff-preview';
import {
  getPatient,
  getPatientClinicalSummary,
  getPatientFamily,
  listBloodTypes,
  listPatients,
  listSexes,
  registerClinicalPatient,
  registerEmergencyPatient,
} from '../api/patients.api';
import type {
  EmergencyPatientRegistrationPayload,
  PatientListParams,
  StaffPatientRegistrationPayload,
} from '../types/patient.types';

function usePatientPreviewMode() {
  const { session } = useAuthSession();
  return session?.isPreview === true;
}

function previewPatients(params: PatientListParams) {
  const search = params.search?.trim().toLocaleLowerCase('es-NI');
  const filtered = previewPatientsPage.items.filter((patient) => {
    const haystack = [
      patient.persona.nombres,
      patient.persona.apellidos,
      patient.persona.telefono,
      patient.persona.email,
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('es-NI');
    return (
      (!search || haystack.includes(search)) &&
      (!params.sexo_id || patient.persona.sexo_id === params.sexo_id) &&
      (!params.tipo_sangre_id || patient.tipo_sangre_id === params.tipo_sangre_id)
    );
  });
  const limit = params.limit ?? 10;
  const offset = params.offset ?? 0;
  return {
    items: filtered.slice(offset, offset + limit),
    total: filtered.length,
    limit,
    offset,
  };
}

export function usePatients(params: PatientListParams) {
  const isPreview = usePatientPreviewMode();
  const normalized = {
    search: params.search || undefined,
    sexo_id: params.sexo_id,
    tipo_sangre_id: params.tipo_sangre_id,
    limit: params.limit ?? 10,
    offset: params.offset ?? 0,
  };
  return useQuery({
    queryKey: queryKeys.clinical.patientsDirectory.list(normalized),
    queryFn: () =>
      isPreview ? Promise.resolve(previewPatients(normalized)) : listPatients(normalized),
  });
}

export function usePatient(patientId: number) {
  const isPreview = usePatientPreviewMode();
  return useQuery({
    enabled: Number.isFinite(patientId) && patientId > 0,
    queryKey: queryKeys.clinical.patientsDirectory.detail(patientId),
    queryFn: () => {
      if (isPreview) {
        const patient = previewPatientDetails[patientId];
        return patient
          ? Promise.resolve(patient)
          : Promise.reject(new Error('Paciente preview no encontrado'));
      }
      return getPatient(patientId);
    },
  });
}

export function usePatientFamily(patientId: number) {
  const isPreview = usePatientPreviewMode();
  return useQuery({
    enabled: Number.isFinite(patientId) && patientId > 0,
    queryKey: queryKeys.clinical.patientsDirectory.family(patientId),
    queryFn: () =>
      isPreview
        ? Promise.resolve(previewPatientFamilies[patientId] ?? [])
        : getPatientFamily(patientId),
  });
}

export function usePatientClinicalSummary(patientId: number) {
  const isPreview = usePatientPreviewMode();
  return useQuery({
    enabled: Number.isFinite(patientId) && patientId > 0,
    queryKey: queryKeys.clinical.patientsDirectory.clinicalSummary(patientId),
    queryFn: () =>
      isPreview
        ? Promise.resolve(
            previewPatientSummaries[patientId] ?? { paciente_id: patientId, expediente: null },
          )
        : getPatientClinicalSummary(patientId),
  });
}

export function usePatientCatalogs() {
  const isPreview = usePatientPreviewMode();
  const sexes = useQuery({
    queryKey: queryKeys.clinical.patientsDirectory.sexes,
    queryFn: () => (isPreview ? Promise.resolve(previewSexesPage) : listSexes()),
    staleTime: 1000 * 60 * 30,
  });
  const bloodTypes = useQuery({
    queryKey: queryKeys.clinical.patientsDirectory.bloodTypes,
    queryFn: () =>
      isPreview ? Promise.resolve(previewBloodTypesPage) : listBloodTypes(),
    staleTime: 1000 * 60 * 30,
  });
  return { sexes, bloodTypes };
}

export function useRegisterPatient() {
  const isPreview = usePatientPreviewMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StaffPatientRegistrationPayload) =>
      isPreview
        ? Promise.resolve(previewPatientDetails[101])
        : registerClinicalPatient(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.clinical.all, 'patients-directory'],
      });
    },
  });
}

export function useRegisterEmergencyPatient() {
  const isPreview = usePatientPreviewMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EmergencyPatientRegistrationPayload) =>
      isPreview
        ? Promise.resolve({
            paciente: previewPatientDetails[101],
            expediente_id: 7001,
            consulta_id: 9001,
          })
        : registerEmergencyPatient(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.clinical.all, 'patients-directory'],
      });
    },
  });
}
