import { render } from '@testing-library/react-native';

import { MyPatientCard } from '../components/MyPatientCard';
import type { MyPatient } from '../types/my-patient.types';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
// La conversión UTC -> hora local ya se prueba de forma determinística
// (con una zona horaria explícita) en workspace-date-time.test.ts. Acá solo
// se prueba que la tarjeta muestra lo que esa función devuelve -- mockearla
// evita depender del reloj/zona horaria real de la máquina que corre la
// prueba (eso fallaba en CI: reasignar process.env.TZ en runtime no es
// confiable entre plataformas).
jest.mock('@/src/features/appointments/utils/workspace-date-time', () => ({
  formatWorkspaceDateTime: jest.fn(() => '7 sept 2026, 2:00 a. m.'),
}));

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
  it('shows the next appointment using formatWorkspaceDateTime', async () => {
    const screen = await render(<MyPatientCard item={item} onPress={jest.fn()} />);
    expect(screen.getByText(/2:00/)).toBeTruthy();
  });
});