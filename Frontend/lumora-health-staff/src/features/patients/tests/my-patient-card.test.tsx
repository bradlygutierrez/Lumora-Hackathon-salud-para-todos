import { render } from '@testing-library/react-native';

import { MyPatientCard } from '../components/MyPatientCard';
import type { MyPatient } from '../types/my-patient.types';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const item: MyPatient = {
  paciente: {
    id: 9,
    tipo_sangre_id: null,
    alergias: null,
    persona: {
      id: 20,
      nombres: 'Ana',
      apellidos: 'Agenda',
      fecha_nacimiento: null,
      telefono: null,
      email: null,
      sexo_id: null,
      direcciones: [],
    },
  },
  proxima_cita: {
    id: 4,
    paciente_id: 9,
    paciente_nombre: 'Ana Agenda',
    inicio: '2026-09-07T08:00:00Z',
    fin: '2026-09-07T08:45:00Z',
    notas: null,
    estado: null,
    tipo_cita: null,
    ubicacion: null,
  },
  ultima_consulta: null,
};

describe('MyPatientCard scheduling dates', () => {
  it('preserves the published clock for the next appointment', async () => {
    const screen = await render(<MyPatientCard item={item} onPress={jest.fn()} />);
    expect(screen.getByText(/0?8:00/)).toBeTruthy();
  });
});