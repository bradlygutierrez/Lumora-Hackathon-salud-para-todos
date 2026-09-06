import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TourTarget } from '@wrack/react-native-tour-guide';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { LoadingState } from '@/src/shared/components/RemoteState';
import { theme } from '@/src/shared/constants/theme';

const TAB_BAR_CONTENT_HEIGHT = 64;

function TourTabIcon({
  id,
  name,
  color,
  size,
}: {
  id: string;
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size: number;
}) {
  return (
    <TourTarget id={id}>
      <Ionicons color={color} name={name} size={size} />
    </TourTarget>
  );
}

export default function StaffLayout() {
  const { permissions, status } = useAuthSession();
  const insets = useSafeAreaInsets();
  const tabBarBottomPadding = insets.bottom + 8;

  if (status === 'restoring') {
    return <LoadingState title="Restaurando sesión clínica" />;
  }

  if (status === 'anonymous') {
    return <Redirect href="/(auth)/login" />;
  }

  if (status !== 'authenticated') {
    return <LoadingState title="Cargando permisos cl?nicos" />;
  }

  if (!permissions.has('clinica:manage')) {
    return <Redirect href={'/unauthorized' as Href} />;
  }

  return (
    <Tabs
      // "administration" está registrada primero (línea de abajo) solo para
      // que su `href` condicional (según rbac:manage) no reordene el resto
      // de la tab bar visualmente. Eso importa porque el default de
      // `backBehavior` en @react-navigation/bottom-tabs es 'firstRoute'
      // -- NO usa initialRouteName -- así que "volver" (botón/gesto físico
      // de Android, o cualquier GO_BACK sin historial previo) caía siempre
      // en la PRIMERA screen registrada ("administration"), sin importar
      // qué dijera initialRouteName. Para cualquier staff sin rbac:manage
      // eso mostraba "Acceso restringido" -- se veía al salir de Editar
      // Perfil o de Notificaciones (tabs ocultas sin pila propia) y,
      // sobre todo, al usar el botón físico/gesto de retroceso de Android.
      initialRouteName="index"
      backBehavior="initialRoute"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.color.primaryPressed,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: theme.color.mutedText,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        tabBarStyle: {
          backgroundColor: theme.color.surfaceMuted,
          borderTopColor: theme.color.softBorder,
          height: TAB_BAR_CONTENT_HEIGHT + tabBarBottomPadding,
          paddingBottom: tabBarBottomPadding,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name='administration'
        options={{
          title: 'Administración',
          href: permissions.has('rbac:manage') ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <TourTabIcon
              color={color}
              id="tour-tab-administration"
              name="shield-outline"
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Panel',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="grid-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: 'Pacientes',
          tabBarIcon: ({ color, size }) => (
            <TourTabIcon
              color={color}
              id="tour-tab-patients"
              name="people-outline"
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, size }) => (
            <TourTabIcon
              color={color}
              id="tour-tab-agenda"
              name="calendar-outline"
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="directory"
        options={{
          title: 'Personal',
          tabBarIcon: ({ color, size }) => (
            <TourTabIcon
              color={color}
              id="tour-tab-directory"
              name="medical-outline"
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="security"
        options={{
          href: null,
          title: 'Seguridad',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              color={color}
              name="shield-checkmark-outline"
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size }) => (
            <TourTabIcon
              color={color}
              id="tour-tab-profile"
              name="settings-outline"
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="staff/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="appointments/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="edit-profile"
        options={{
          href: null,
          title: 'Editar Perfil',
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          title: 'Notificaciones',
        }}
      />
    </Tabs>
  );
}
