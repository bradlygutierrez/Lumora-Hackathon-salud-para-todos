import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { setupMfa } from '@/src/features/auth/api/auth.api';
import {
  useActiveSessions,
  useMfaMethods,
  useSecurityActions,
} from '@/src/features/auth/hooks/use-security';
import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { env } from '@/src/application/config/env';
import { toApiError } from '@/src/shared/api/api-error';
import { queryKeys } from '@/src/shared/api/query-keys';
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
        <View style={styles.header}>
          <Text style={styles.title}>Centro de seguridad</Text>
          <Text style={styles.subtitle}>Sesiones activas y MFA de la cuenta clínica.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Sesiones activas</Text>
          {sessions.isLoading ? <LoadingState title="Cargando sesiones" /> : null}
          {sessions.isError ? (
            <ErrorState title="No se pudieron cargar las sesiones" />
          ) : null}
          {sessions.data?.length === 0 ? <EmptyState title="Sin sesiones activas" /> : null}
          {sessions.data?.map((session) => (
            <View key={session.id} style={styles.row}>
              <Text style={styles.value}>{session.user_agent ?? 'Dispositivo desconocido'}</Text>
              <Text style={styles.muted}>{session.ip ?? 'IP no disponible'}</Text>
              <Text style={styles.muted}>Expira: {new Date(session.expires_at).toLocaleString()}</Text>
            </View>
          ))}
          <Button onPress={logoutAll}>Cerrar todas las sesiones</Button>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>MFA</Text>
          {methods.isLoading ? <LoadingState title="Cargando MFA" /> : null}
          {methods.isError ? <ErrorState title="No se pudo cargar MFA" /> : null}
          {methods.data?.length === 0 ? <EmptyState title="Sin MFA activo" /> : null}
          {methods.data?.map((method) => (
            <View key={method.id} style={styles.row}>
              <Text style={styles.value}>{method.nombre}</Text>
              <Text style={styles.muted}>{method.activo ? 'Activo' : 'Inactivo'}</Text>
              {method.activo ? (
                <Button
                  loading={disableMfa.isPending}
                  onPress={() => disableMfa.mutate(method.id)}
                >
                  Desactivar MFA
                </Button>
              ) : null}
            </View>
          ))}
          <View style={styles.row}>
            <TextField
              keyboardType="number-pad"
              label="ID metodo MFA"
              onChangeText={setMethodId}
              value={methodId}
            />
            {setupError ? <Text style={styles.error}>{setupError}</Text> : null}
            {setupResult?.map((line) => (
              <Text key={line} style={styles.muted}>
                {line}
              </Text>
            ))}
            <Button loading={isSettingUp} onPress={enableMfa}>
              Activar MFA
            </Button>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    gap: theme.spacing.xs,
  },
  title: {
    color: theme.color.text,
    fontSize: theme.typography.title,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.color.mutedText,
    fontSize: theme.typography.body,
  },
  card: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    color: theme.color.text,
    fontSize: theme.typography.subtitle,
    fontWeight: '800',
  },
  row: {
    borderColor: theme.color.border,
    borderTopWidth: 1,
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.md,
  },
  value: {
    color: theme.color.text,
    fontSize: theme.typography.body,
    fontWeight: '700',
  },
  muted: {
    color: theme.color.mutedText,
    fontSize: theme.typography.caption,
  },
  error: {
    color: theme.color.danger,
    fontSize: theme.typography.caption,
  },
});
