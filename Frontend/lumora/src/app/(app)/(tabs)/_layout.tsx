import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  PatientContextBanner,
} from '@/features/shell/components/PatientContextBanner';

import {
  usePatientContextStore,
} from '@/features/shell/store/patient-context-store';

/**
 * Shell principal de Lumora.
 *
 * Paciente y Cuidador comparten las mismas rutas para evitar duplicar
 * pantallas y lógica patient-scoped.
 *
 * La semántica del tab de salud cambia según el rol:
 * - Paciente -> "Mi salud"
 * - Cuidador -> "Paciente"
 *
 * En ambos casos el contenido utiliza el patientContext activo.
 */
export default function TabsLayout() {
  const role = usePatientContextStore(
    (state) => state.role,
  );

  const healthLabel =
    role === 'caregiver'
      ? 'Paciente'
      : 'Mi salud';

  return (
    <Tabs
      screenOptions={{
        headerShown: true,

        /**
         * El banner solo renderiza contenido para Cuidador.
         * En Paciente retorna null.
         */
        header: () => (
          <PatientContextBanner />
        ),

        tabBarActiveTintColor: '#4A86B6',
        tabBarInactiveTintColor: '#7B848B',

        tabBarStyle: {
          backgroundColor: '#fffdfa',
          borderTopColor: '#d7e8f5',
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="home-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="health"
        options={{
          title: healthLabel,
          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name={
                role === 'caregiver'
                  ? 'person-circle-outline'
                  : 'heart-outline'
              }
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="medication"
        options={{
          title: 'Medicación',
          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="medical-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Citas',
          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="calendar-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="person-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
