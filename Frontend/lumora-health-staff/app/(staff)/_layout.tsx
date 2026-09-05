import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { LoadingState } from '@/src/shared/components/RemoteState';
import { theme } from '@/src/shared/constants/theme';

const TAB_BAR_CONTENT_HEIGHT = 72;

export default function StaffLayout() {
  const { permissions, status } = useAuthSession();
  const insets = useSafeAreaInsets();
  // Un poco más de aire además del inset real, para que los íconos no
  // queden pegados a la barra de navegación nativa del celular.
  const tabBarBottomPadding = insets.bottom + theme.spacing.sm;

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
      // de la tab bar visualmente -- pero sin initialRouteName, el Tabs
      // navigator usa la PRIMERA screen registrada como fallback cuando
      // "volver" (gesto/botón de Android, o router.back() sin historial)
      // no tiene una entrada previa a la cual regresar. Eso mandaba a
      // "administration", que para cualquier staff sin rbac:manage muestra
      // "Acceso restringido" -- se veía justo al salir de Editar Perfil o
      // de Notificaciones, dos tabs ocultas (href: null) sin pila propia.
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarActiveBackgroundColor: theme.color.primarySoft,
        tabBarActiveTintColor: theme.color.primaryPressed,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: theme.color.mutedText,
        tabBarItemStyle: {
          borderRadius: 16,
          marginHorizontal: 2,
          marginVertical: 7,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
        },
        tabBarStyle: {
          backgroundColor: theme.color.surfaceMuted,
          borderTopColor: theme.color.softBorder,
          height: TAB_BAR_CONTENT_HEIGHT + tabBarBottomPadding,
          paddingBottom: tabBarBottomPadding,
          paddingHorizontal: 8,
        },
      }}
    >
      <Tabs.Screen
        name='administration'
        options={{
          title: 'Administración',
          href: permissions.has('rbac:manage') ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons color={color} name='shield-outline' size={size} />,
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
