import type { ProfessionalAgendaItem } from '@/src/features/appointments/types/appointment.types';
import type { Consultation } from '@/src/shared/types/clinical';
import type { Patient } from './patient.types';

export type MyPatient = {
  paciente: Patient;
  proxima_cita: ProfessionalAgendaItem | null;
  ultima_consulta: Consultation | null;
};
