import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TourTarget,
  useTourPersistence,
} from '@wrack/react-native-tour-guide';

import {
  PatientContextBanner,
} from '@/features/shell/components/PatientContextBanner';

import {
  usePatientContextStore,
} from '@/features/shell/store/patient-context-store';

const CAREGIVER_NAVIGATION_TOUR_STEPS = [
  {
    id: 'navigation-home',
    targetId: 'tour-tab-home',
    title: 'Inicio',
    description: 'Volvé al resumen del paciente activo desde cualquier sección.',
  },
  {
    id: 'navigation-health',
    targetId: 'tour-tab-health',
    title: 'Paciente',
    description: 'Consultá la salud, indicadores y expediente del paciente seleccionado.',
  },
  {
    id: 'navigation-medication',
    targetId: 'tour-tab-medication',
    title: 'Medicación',
    description: 'Revisá medicamentos, dosis y recordatorios del paciente activo.',
  },
  {
    id: 'navigation-appointments',
    targetId: 'tour-tab-appointments',
    title: 'Citas',
    description: 'Consultá y gestioná las citas del paciente seleccionado.',
  },
  {
    id: 'navigation-profile',
    targetId: 'tour-tab-profile',
    title: 'Perfil',
    description: 'Cambiá de paciente y administrá tu cuenta, permisos y seguridad.',
  },
];

function TourTabIcon({
  id,
  name,
  color,
  size,
}: {
  id: string;
  name: keyof typeof Ionicons.glyphMap;
  color: ColorValue;
  size: number;
}) {
  return (
    <TourTarget id={id}>
      <Ionicons name={name} size={size} color={color} />
    </TourTarget>
  );
}

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
  const insets = useSafeAreaInsets();
  const { startTour } = useTourPersistence();
  const role = usePatientContextStore(
    (state) => state.role,
  );

  useEffect(() => {
    if (role === 'caregiver') {
      void startTour(CAREGIVER_NAVIGATION_TOUR_STEPS, {
        tourId: 'caregiver-navigation-tour',
      });
    }
  }, [role, startTour]);

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
          height: 64 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
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
            <TourTabIcon
              id="tour-tab-home"
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
            <TourTabIcon
              name={
                role === 'caregiver'
                  ? 'person-circle-outline'
                  : 'heart-outline'
              }
              id="tour-tab-health"
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
            <TourTabIcon
              id="tour-tab-medication"
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
            <TourTabIcon
              id="tour-tab-appointments"
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
            <TourTabIcon
              id="tour-tab-profile"
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
