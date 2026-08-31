import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs, type Href } from 'expo-router';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { LoadingState } from '@/src/shared/components/RemoteState';
import { theme } from '@/src/shared/constants/theme';

export default function StaffLayout() {
  const { permissions, status } = useAuthSession();

  if (status === 'restoring') {
    return <LoadingState title="Restaurando sesión clínica" />;
  }

  if (status === 'anonymous') {
    return <Redirect href="/(auth)/login" />;
  }

  if (!permissions.has('clinica:manage')) {
    return <Redirect href={'/unauthorized' as Href} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.color.primary,
        tabBarInactiveTintColor: theme.color.mutedText,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Panel',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="pulse-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: 'Pacientes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="people-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="calendar-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="directory"
        options={{
          title: 'Personal',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="medical-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="security"
        options={{
          href: null,
          title: 'Seguridad',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="shield-checkmark-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="settings-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="staff/[id]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
