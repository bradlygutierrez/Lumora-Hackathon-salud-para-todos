import { Tabs } from 'expo-router';

import { theme } from '@/shared/theme/tokens';

/**
 * Navegación base Paciente/Cuidador.
 * B09 añadirá patientContext, rol y permisos; B07 solo deja el shell listo.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.textPrimary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.primary,
        },
        tabBarLabelStyle: {
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="health" options={{ title: 'Mi Salud' }} />
      <Tabs.Screen name="medication" options={{ title: 'Medicación' }} />
      <Tabs.Screen name="appointments" options={{ title: 'Citas' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
