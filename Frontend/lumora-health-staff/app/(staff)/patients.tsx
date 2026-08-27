import { EmptyState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';

export default function StaffPatientsScreen() {
  return (
    <Screen>
      <EmptyState
        title="Pacientes"
        message="La navegación base está lista. La búsqueda clínica se implementará con el contrato de FastAPI en la siguiente tarea."
      />
    </Screen>
  );
}
