import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { env } from '@/src/application/config/env';
import { setupMfa } from '@/src/features/auth/api/auth.api';
import {
  useActiveSessions,
  useMfaMethods,
  useSecurityActions,
} from '@/src/features/auth/hooks/use-security';
import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { toApiError } from '@/src/shared/api/api-error';
import { queryKeys } from '@/src/shared/api/query-keys';
import { AppTopBar } from '@/src/shared/components/AppTopBar';
import { Button } from '@/src/shared/components/Button';
import { EmptyState, ErrorState, LoadingState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { TextField } from '@/src/shared/components/TextField';
import { theme } from '@/src/shared/constants/theme';

export default function SecurityCenterScreen() {
  const { signOutAll } = useAuthSession();
  const queryClient = useQueryClient();
  const sessions = useActiveSessions();
  const methods = useMfaMethods();
  const { disableMfa } = useSecurityActions();
  const [methodId, setMethodId] = useState('');
  const [setupResult, setSetupResult] = useState<string[] | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);

  async function logoutAll() {
    await signOutAll();
    await queryClient.invalidateQueries({ queryKey: queryKeys.auth.sessions });
  }

  async function enableMfa() {
    const parsedMethodId = Number(methodId);
    if (!Number.isInteger(parsedMethodId) || parsedMethodId <= 0) {
      setSetupError('Ingresa el ID del metodo MFA definido por FastAPI.');
      return;
    }

    setIsSettingUp(true);
    setSetupError(null);
    try {
      if (env.enableUiPreview) {
        setSetupResult([
          'Secreto: PREVIEW-MFA-SECRET',
          'URI: otpauth://totp/Lumora:preview',
          'Codigo: PREVIEW-001',
          'Codigo: PREVIEW-002',
        ]);
        return;
      }
      const response = await setupMfa({ metodo_id: parsedMethodId });
      setSetupResult([
        `Secreto: ${response.secret}`,
        `URI: ${response.provisioning_uri}`,
        ...response.recovery_codes.map((code) => `Codigo: ${code}`),
      ]);
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.mfaMethods });
    } catch (error) {
      setSetupError(toApiError(error).message);
    } finally {
      setIsSettingUp(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <AppTopBar />
        <View style={styles.header}>
          <Text style={styles.title}>Centro de Seguridad</Text>
          <Text style={styles.subtitle}>
            Gestiona la seguridad de tu cuenta, metodos de autenticacion y sesiones activas.
          </Text>
        </View>

        <SectionCard icon="keypad-outline" title="Contraseña">
          <Text style={styles.label}>Último cambio</Text>
          <Text style={styles.value}>hace 45 días (Oct 12, 2026)</Text>
          <View style={styles.hintRow}>
            <Ionicons color={theme.color.primary} name="information-circle-outline" size={16} />
            <Text style={styles.hint}>
              Recomendamos cambiar tu contraseña cada 90 dias para optima seguridad.
            </Text>
          </View>
          <Button icon="pencil" variant="secondary">
            Cambiar Contraseña
          </Button>
        </SectionCard>

        <SectionCard
          icon="shield-checkmark-outline"
          right={<StatusPill active={Boolean(methods.data?.some((method) => method.activo))} />}
          title="Autenticación de Dos Factores (MFA)"
        >
          <Text style={styles.description}>
            Capas extra de seguridad requeridas al iniciar sesion desde dispositivos no reconocidos.
          </Text>
          {methods.isLoading ? <LoadingState title="Cargando MFA" /> : null}
          {methods.isError ? <ErrorState title="No se pudo cargar MFA" /> : null}
          {methods.data?.length === 0 ? <EmptyState title="Sin MFA activo" /> : null}
          {methods.data?.map((method) => (
            <View key={method.id} style={styles.methodRow}>
              <View style={styles.methodRail} />
              <Ionicons color={theme.color.primary} name="phone-portrait-outline" size={22} />
              <View style={styles.methodText}>
                <Text style={styles.methodTitle}>App de Autenticación</Text>
                <Text style={styles.methodMeta}>{method.nombre} {method.activo ? '(Principal)' : '(Inactivo)'}</Text>
              </View>
              {method.activo ? (
                <Ionicons
                  color={theme.color.mutedText}
                  name="ellipsis-vertical"
                  onPress={() => disableMfa.mutate(method.id)}
                  size={22}
                />
              ) : null}
            </View>
          ))}
          <View style={styles.methodRow}>
            <Ionicons color={theme.color.mutedText} name="chatbox-outline" size={22} />
            <View style={styles.methodText}>
              <Text style={styles.methodTitle}>Recuperación por SMS</Text>
              <Text style={styles.methodMeta}>Termina en **** 4291</Text>
            </View>
            <Ionicons color={theme.color.mutedText} name="ellipsis-vertical" size={22} />
          </View>
          <TextField
            keyboardType="number-pad"
            label="ID metodo MFA"
            onChangeText={setMethodId}
            value={methodId}
          />
          {setupError ? <Text style={styles.error}>{setupError}</Text> : null}
          {setupResult?.map((line) => (
            <Text key={line} style={styles.hint}>
              {line}
            </Text>
          ))}
          <Button icon="add" loading={isSettingUp} onPress={enableMfa} variant="ghost">
            Añadir Método
          </Button>
        </SectionCard>

        <SectionCard icon="desktop-outline" title="Sesiones Activas">
          {sessions.isLoading ? <LoadingState title="Cargando sesiones" /> : null}
          {sessions.isError ? <ErrorState title="No se pudieron cargar las sesiones" /> : null}
          {sessions.data?.length === 0 ? <EmptyState title="Sin sesiones activas" /> : null}
          {sessions.data?.map((session, index) => (
            <View key={session.id} style={[styles.sessionRow, index === 0 ? styles.currentSession : null]}>
              <Ionicons
                color={theme.color.primary}
                name={index === 0 ? 'desktop-outline' : 'phone-portrait-outline'}
                size={22}
              />
              <View style={styles.methodText}>
                <View style={styles.sessionTitleRow}>
                  <Text style={styles.methodTitle}>{session.user_agent ?? 'Dispositivo desconocido'}</Text>
                  {index === 0 ? <Text style={styles.currentBadge}>ACTUAL</Text> : null}
                </View>
                <Text style={styles.methodMeta}>{session.ip ?? 'IP no disponible'}</Text>
              </View>
            </View>
          ))}
          <Button icon="log-out-outline" onPress={logoutAll} variant="danger">
            Cerrar sesión en todos los demás dispositivos
          </Button>
        </SectionCard>

        <SectionCard icon="time-outline" right={<Text style={styles.viewAll}>Ver Todo</Text>} title="Actividad de Seguridad Reciente">
          <TimelineItem active detail="macOS - Chrome (Sesion actual)" title="Inicio de sesión exitoso" when="Today, 09:41 AM" />
          <TimelineItem danger detail="Contraseña incorrecta. Dispositivo desconocido." title="Intento de inicio de sesión fallido" when="Yesterday, 11:20 PM" />
          <TimelineItem detail="App de autenticación verificada" title="Método MFA añadido" when="Oct 12, 2026" />
        </SectionCard>
      </ScrollView>
    </Screen>
  );
}

function SectionCard({
  children,
  icon,
  right,
  title,
}: {
  children: React.ReactNode;
  icon: keyof typeof Ionicons.glyphMap;
  right?: React.ReactNode;
  title: string;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleGroup}>
          <View style={styles.cardIcon}>
            <Ionicons color={theme.color.primary} name={icon} size={24} />
          </View>
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <View style={styles.statusPill}>
      <Ionicons color={theme.color.success} name="checkmark-circle-outline" size={14} />
      <Text style={styles.statusText}>{active ? 'Activo' : 'Inactivo'}</Text>
    </View>
  );
}

function TimelineItem({
  active = false,
  danger = false,
  detail,
  title,
  when,
}: {
  active?: boolean;
  danger?: boolean;
  detail: string;
  title: string;
  when: string;
}) {
  return (
    <View style={styles.timelineItem}>
      <View style={[styles.timelineDot, active ? styles.timelineDotActive : null]} />
      <View style={styles.timelineContent}>
        <View style={styles.timelineHeader}>
          <Text style={styles.timelineTitle}>{title}</Text>
          <Text style={styles.methodMeta}>{when}</Text>
        </View>
        <Text style={[styles.methodMeta, danger ? styles.error : null]}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xxl,
  },
  title: {
    color: theme.color.primary,
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    color: theme.color.mutedText,
    fontSize: theme.typography.body,
    lineHeight: 24,
  },
  card: {
    backgroundColor: theme.color.surfaceMuted,
    borderColor: theme.color.softBorder,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.lg,
    padding: 25,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitleGroup: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  cardIcon: {
    alignItems: 'center',
    backgroundColor: '#EBEEF4',
    borderRadius: theme.radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  cardTitle: {
    color: theme.color.text,
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
  },
  label: {
    color: theme.color.mutedText,
    fontSize: theme.typography.caption,
    fontWeight: '800',
  },
  value: {
    color: theme.color.text,
    fontSize: theme.typography.body,
  },
  description: {
    color: theme.color.mutedText,
    fontSize: theme.typography.body,
    lineHeight: 24,
  },
  hintRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  hint: {
    color: theme.color.mutedText,
    flex: 1,
    fontSize: theme.typography.caption,
    lineHeight: 18,
  },
  methodRow: {
    alignItems: 'center',
    backgroundColor: theme.color.surfaceMuted,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 72,
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.md,
  },
  methodRail: {
    alignSelf: 'stretch',
    backgroundColor: theme.color.primary,
    marginLeft: -theme.spacing.md,
    width: 4,
  },
  methodText: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  methodTitle: {
    color: theme.color.text,
    fontSize: theme.typography.caption,
    fontWeight: '900',
  },
  methodMeta: {
    color: theme.color.mutedText,
    fontSize: 12,
  },
  error: {
    color: theme.color.danger,
  },
  statusPill: {
    alignItems: 'center',
    backgroundColor: theme.color.successSoft,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  statusText: {
    color: theme.color.success,
    fontSize: theme.typography.caption,
    fontWeight: '800',
  },
  sessionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  currentSession: {
    backgroundColor: '#F1F4FA',
    borderRadius: theme.radius.md,
  },
  sessionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  currentBadge: {
    backgroundColor: theme.color.successSoft,
    borderRadius: theme.radius.sm,
    color: theme.color.success,
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  viewAll: {
    color: theme.color.primary,
    fontSize: theme.typography.caption,
    fontWeight: '900',
  },
  timelineItem: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  timelineDot: {
    backgroundColor: theme.color.surfaceMuted,
    borderColor: theme.color.subtleText,
    borderRadius: 8,
    borderWidth: 2,
    height: 16,
    marginTop: 2,
    width: 16,
  },
  timelineDotActive: {
    borderColor: theme.color.primary,
  },
  timelineContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  timelineHeader: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  timelineTitle: {
    color: theme.color.text,
    flex: 1,
    fontSize: theme.typography.caption,
    fontWeight: '900',
  },
});
