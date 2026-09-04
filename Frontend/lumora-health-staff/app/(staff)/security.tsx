import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  changeStaffPassword,
  confirmMfaSetup,
  setupMfa,
} from '@/src/features/auth/api/auth.api';
import {
  useActiveSessions,
  useMfaMethods,
  useSecurityActions,
} from '@/src/features/auth/hooks/use-security';
import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import type {
  MfaMethod,
  MfaSetupResponse,
} from '@/src/features/auth/types/auth.types';
import { toApiError } from '@/src/shared/api/api-error';
import { queryKeys } from '@/src/shared/api/query-keys';
import { AppTopBar } from '@/src/shared/components/AppTopBar';
import { Button } from '@/src/shared/components/Button';
import { EmptyState, ErrorState, LoadingState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { TextField } from '@/src/shared/components/TextField';
import { theme } from '@/src/shared/constants/theme';

type PendingMfaSetup = {
  method: MfaMethod;
  response: MfaSetupResponse;
};

function mfaMethodLabel(name: string) {
  if (name === 'totp') return 'Aplicación de autenticación';
  if (name === 'email') return 'Correo electrónico';
  return name;
}

function mfaMethodDescription(name: string) {
  if (name === 'totp') {
    return 'Genera códigos temporales desde una aplicación autenticadora.';
  }
  if (name === 'email') {
    return 'Recibe un código temporal en tu correo verificado.';
  }
  return 'Método de autenticación configurado por Lumora.';
}

function mfaMethodIcon(name: string): keyof typeof Ionicons.glyphMap {
  return name === 'email' ? 'mail-outline' : 'phone-portrait-outline';
}

export default function SecurityCenterScreen() {
  const { session, signOutAll } = useAuthSession();
  const queryClient = useQueryClient();
  const sessions = useActiveSessions();
  const methods = useMfaMethods();
  const { disableMfa, logoutOthers, revokeSession } = useSecurityActions();
  const [pendingSetup, setPendingSetup] = useState<PendingMfaSetup | null>(null);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isConfirmingSetup, setIsConfirmingSetup] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const isPreview = Boolean(session?.isPreview);

  async function logoutAll() {
    await signOutAll();
    await queryClient.invalidateQueries({ queryKey: queryKeys.auth.sessions });
  }

  async function logoutOtherSessions() {
    await logoutOthers.mutateAsync();
  }

  async function updatePassword() {
    setPasswordMessage(null);
    setPasswordError(null);
    if (isPreview) {
      setPasswordError('La contraseña no se puede modificar desde una sesión de previsualización.');
      return;
    }
    setIsChangingPassword(true);
    try {
      const response = await changeStaffPassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setPasswordMessage(response.message);
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.sessions });
    } catch (error) {
      setPasswordError(toApiError(error).message);
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function beginMfaSetup(method: MfaMethod) {
    if (isPreview) {
      setSetupError('La configuración MFA requiere una sesión autenticada real.');
      return;
    }

    setSetupError(null);
    setRecoveryCodes(null);
    setConfirmationCode('');
    setIsSettingUp(true);
    try {
      const response = await setupMfa({ metodo_id: method.metodo_id });
      setPendingSetup({ method, response });
    } catch (error) {
      setSetupError(toApiError(error).message);
    } finally {
      setIsSettingUp(false);
    }
  }

  async function confirmSetup() {
    if (!pendingSetup) return;
    if (!/^\d{6}$/.test(confirmationCode)) {
      setSetupError('Ingresa el código de confirmación de 6 dígitos.');
      return;
    }

    setSetupError(null);
    setIsConfirmingSetup(true);
    try {
      const response = await confirmMfaSetup({
        method_id: pendingSetup.response.method_id,
        code: confirmationCode,
      });
      setRecoveryCodes(response.recovery_codes);
      setPendingSetup(null);
      setConfirmationCode('');
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.mfaMethods });
    } catch (error) {
      setSetupError(toApiError(error).message);
    } finally {
      setIsConfirmingSetup(false);
    }
  }

  async function disableMethod(method: MfaMethod) {
    if (method.id === null) {
      setSetupError('El método MFA no tiene una configuración activa para deshabilitar.');
      return;
    }
    if (isPreview) {
      setSetupError('La configuración MFA requiere una sesión autenticada real.');
      return;
    }
    setSetupError(null);
    setPendingSetup(null);
    setRecoveryCodes(null);
    try {
      await disableMfa.mutateAsync(method.id);
    } catch (error) {
      setSetupError(toApiError(error).message);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <AppTopBar />
        <View style={styles.header}>
          <Text style={styles.title}>Centro de Seguridad</Text>
          <Text style={styles.subtitle}>
            Gestiona tu contraseña, autenticación de dos factores y sesiones activas.
          </Text>
        </View>

        <SectionCard icon="keypad-outline" title="Contraseña">
          <Text style={styles.description}>
            Al cambiarla, se conserva la sesión actual y se revocan las demás sesiones activas.
          </Text>
          <TextField
            label="Contraseña actual"
            onChangeText={setCurrentPassword}
            secureTextEntry
            value={currentPassword}
          />
          <TextField
            label="Nueva contraseña"
            onChangeText={setNewPassword}
            secureTextEntry
            value={newPassword}
          />
          {passwordError ? <Text accessibilityRole="alert" style={styles.error}>{passwordError}</Text> : null}
          {passwordMessage ? <Text style={styles.successMessage}>{passwordMessage}</Text> : null}
          <Button
            icon="pencil"
            loading={isChangingPassword}
            onPress={updatePassword}
            variant="secondary"
          >
            Cambiar contraseña
          </Button>
        </SectionCard>

        <SectionCard
          icon="shield-checkmark-outline"
          right={<StatusPill active={Boolean(methods.data?.some((method) => method.activo))} />}
          title="Autenticación de Dos Factores (MFA)"
        >
          <Text style={styles.description}>
            Elige uno de los métodos soportados por el backend. La activación se completa únicamente después de confirmar un código válido.
          </Text>
          {methods.isLoading ? <LoadingState title="Cargando MFA" /> : null}
          {methods.isError ? <ErrorState title="No se pudo cargar MFA" /> : null}
          {!methods.isLoading && !methods.isError && methods.data?.length === 0 ? (
            <EmptyState title="MFA no disponible" message="No hay métodos de MFA disponibles para esta cuenta." />
          ) : null}

          {methods.data?.map((method) => (
            <View key={method.metodo_id} style={styles.methodRow}>
              <View style={[styles.methodRail, method.activo ? styles.methodRailActive : null]} />
              <View style={styles.methodIcon}>
                <Ionicons color={theme.color.primaryPressed} name={mfaMethodIcon(method.nombre)} size={22} />
              </View>
              <View style={styles.methodText}>
                <Text style={styles.methodTitle}>{mfaMethodLabel(method.nombre)}</Text>
                <Text style={styles.methodMeta}>{mfaMethodDescription(method.nombre)}</Text>
                <Text style={[styles.methodStatus, method.activo ? styles.methodStatusActive : null]}>
                  {method.activo ? 'Activo' : 'Inactivo'}
                </Text>
              </View>
              <Button
                accessibilityLabel={`${method.activo ? 'Desactivar' : 'Configurar'} ${mfaMethodLabel(method.nombre)}`}
                disabled={isSettingUp || isConfirmingSetup}
                onPress={() => method.activo ? disableMethod(method) : beginMfaSetup(method)}
                variant={method.activo ? 'danger' : 'secondary'}
              >
                {method.activo ? 'Desactivar' : 'Configurar'}
              </Button>
            </View>
          ))}

          {pendingSetup ? (
            <View style={styles.setupCard}>
              <View style={styles.setupHeading}>
                <Ionicons color={theme.color.primaryPressed} name="shield-checkmark-outline" size={22} />
                <View style={styles.methodText}>
                  <Text style={styles.setupTitle}>Confirmar {mfaMethodLabel(pendingSetup.method.nombre)}</Text>
                  <Text style={styles.methodMeta}>El método todavía no está activo.</Text>
                </View>
              </View>

              {pendingSetup.method.nombre === 'email' ? (
                <Text style={styles.description}>
                  Lumora envió un código de 6 dígitos al correo verificado de tu cuenta.
                </Text>
              ) : null}

              {pendingSetup.response.secret ? (
                <View style={styles.secretBox}>
                  <Text style={styles.secretLabel}>Secreto TOTP</Text>
                  <Text selectable style={styles.secretValue}>{pendingSetup.response.secret}</Text>
                </View>
              ) : null}

              {pendingSetup.response.provisioning_uri ? (
                <View style={styles.secretBox}>
                  <Text style={styles.secretLabel}>URI para la aplicación autenticadora</Text>
                  <Text selectable style={styles.secretUri}>{pendingSetup.response.provisioning_uri}</Text>
                </View>
              ) : null}

              <TextField
                keyboardType="number-pad"
                label="Código de confirmación"
                maxLength={6}
                onChangeText={(value) => setConfirmationCode(value.replace(/\D/g, '').slice(0, 6))}
                value={confirmationCode}
              />
              <Button loading={isConfirmingSetup} onPress={confirmSetup}>
                Activar MFA
              </Button>
            </View>
          ) : null}

          {setupError ? <Text accessibilityRole="alert" style={styles.error}>{setupError}</Text> : null}

          {recoveryCodes ? (
            <View accessibilityRole="summary" style={styles.recoveryCard}>
              <View style={styles.setupHeading}>
                <Ionicons color={theme.color.success} name="checkmark-circle-outline" size={22} />
                <View style={styles.methodText}>
                  <Text style={styles.recoveryTitle}>MFA activado</Text>
                  <Text style={styles.methodMeta}>
                    Guardá estos códigos de recuperación ahora. Solo se muestran al activar el método.
                  </Text>
                </View>
              </View>
              {recoveryCodes.map((code) => (
                <Text key={code} selectable style={styles.recoveryCode}>{code}</Text>
              ))}
            </View>
          ) : null}
        </SectionCard>

        <SectionCard icon="desktop-outline" title="Sesiones Activas">
          {sessions.isLoading ? <LoadingState title="Cargando sesiones" /> : null}
          {sessions.isError ? <ErrorState title="No se pudieron cargar las sesiones" /> : null}
          {sessions.data?.length === 0 ? <EmptyState title="Sin sesiones activas" /> : null}
          {sessions.data?.map((activeSession) => (
            <View
              key={activeSession.id}
              style={[styles.sessionRow, activeSession.is_current ? styles.currentSession : null]}
            >
              <Ionicons
                color={theme.color.primary}
                name={activeSession.is_current ? 'desktop-outline' : 'phone-portrait-outline'}
                size={22}
              />
              <View style={styles.methodText}>
                <View style={styles.sessionTitleRow}>
                  <Text style={styles.methodTitle}>
                    {activeSession.device_name || activeSession.user_agent || 'Dispositivo desconocido'}
                  </Text>
                  {activeSession.is_current ? <Text style={styles.currentBadge}>ACTUAL</Text> : null}
                </View>
                <Text style={styles.methodMeta}>
                  {activeSession.platform} · {activeSession.ip_address ?? activeSession.ip ?? 'IP no disponible'}
                </Text>
              </View>
              {!activeSession.is_current ? (
                <Button
                  accessibilityLabel={`Revocar sesión ${activeSession.id}`}
                  onPress={() => revokeSession.mutate(activeSession.id)}
                  variant="ghost"
                >
                  Revocar
                </Button>
              ) : null}
            </View>
          ))}
          <Button icon="log-out-outline" onPress={logoutOtherSessions} variant="secondary">
            Cerrar sesión en todos los demás dispositivos
          </Button>
          <Button icon="log-out-outline" onPress={logoutAll} variant="danger">
            Cerrar todas las sesiones
          </Button>
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
    <View style={[styles.statusPill, active ? styles.statusPillActive : null]}>
      <Ionicons
        color={active ? theme.color.success : theme.color.mutedText}
        name={active ? 'checkmark-circle-outline' : 'ellipse-outline'}
        size={14}
      />
      <Text style={[styles.statusText, active ? styles.statusTextActive : null]}>
        {active ? 'Activo' : 'Inactivo'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  header: { gap: theme.spacing.sm, marginTop: theme.spacing.xl },
  title: { color: theme.color.primaryPressed, fontSize: 28, fontWeight: '900' },
  subtitle: { color: theme.color.mutedText, fontSize: theme.typography.body, lineHeight: 24 },
  card: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.softBorder,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.lg,
    padding: 22,
  },
  cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  cardTitleGroup: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: theme.spacing.md },
  cardIcon: {
    alignItems: 'center', backgroundColor: theme.color.primarySoft, borderRadius: theme.radius.pill,
    height: 42, justifyContent: 'center', width: 42,
  },
  cardTitle: { color: theme.color.text, flex: 1, fontSize: 20, fontWeight: '900' },
  description: { color: theme.color.mutedText, fontSize: 14, lineHeight: 21 },
  error: { color: theme.color.danger, fontSize: 13, lineHeight: 19 },
  successMessage: { color: theme.color.success, fontSize: 13, fontWeight: '700' },
  methodRow: {
    alignItems: 'center', backgroundColor: theme.color.surfaceMuted, borderColor: theme.color.border,
    borderRadius: theme.radius.md, borderWidth: 1, flexDirection: 'row', gap: theme.spacing.md,
    minHeight: 86, overflow: 'hidden', padding: theme.spacing.md,
  },
  methodRail: { alignSelf: 'stretch', backgroundColor: theme.color.softBorder, marginLeft: -theme.spacing.md, width: 4 },
  methodRailActive: { backgroundColor: theme.color.success },
  methodIcon: {
    alignItems: 'center', backgroundColor: theme.color.primarySoft, borderRadius: 22,
    height: 44, justifyContent: 'center', width: 44,
  },
  methodText: { flex: 1, gap: 4 },
  methodTitle: { color: theme.color.text, fontSize: 15, fontWeight: '900' },
  methodMeta: { color: theme.color.mutedText, fontSize: 12, lineHeight: 17 },
  methodStatus: { color: theme.color.mutedText, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  methodStatusActive: { color: theme.color.success },
  setupCard: {
    backgroundColor: theme.color.surfaceMuted, borderColor: theme.color.primary, borderRadius: theme.radius.md,
    borderWidth: 1, gap: theme.spacing.md, padding: theme.spacing.lg,
  },
  setupHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: theme.spacing.sm },
  setupTitle: { color: theme.color.text, fontSize: 16, fontWeight: '900' },
  secretBox: { backgroundColor: theme.color.surface, borderRadius: theme.radius.sm, gap: 4, padding: theme.spacing.md },
  secretLabel: { color: theme.color.mutedText, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  secretValue: { color: theme.color.text, fontSize: 15, fontWeight: '800' },
  secretUri: { color: theme.color.mutedText, fontSize: 11, lineHeight: 17 },
  recoveryCard: {
    backgroundColor: theme.color.successSoft, borderRadius: theme.radius.md, gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  recoveryTitle: { color: theme.color.success, fontSize: 16, fontWeight: '900' },
  recoveryCode: {
    backgroundColor: theme.color.surface, borderRadius: theme.radius.sm, color: theme.color.text,
    fontSize: 14, fontWeight: '800', padding: theme.spacing.sm,
  },
  statusPill: {
    alignItems: 'center', backgroundColor: theme.color.surfaceMuted, borderRadius: theme.radius.pill,
    flexDirection: 'row', gap: theme.spacing.xs, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs,
  },
  statusPillActive: { backgroundColor: theme.color.successSoft },
  statusText: { color: theme.color.mutedText, fontSize: theme.typography.caption, fontWeight: '800' },
  statusTextActive: { color: theme.color.success },
  sessionRow: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.md, padding: theme.spacing.md },
  currentSession: { backgroundColor: theme.color.surfaceMuted, borderRadius: theme.radius.md },
  sessionTitleRow: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  currentBadge: {
    backgroundColor: theme.color.successSoft, borderRadius: theme.radius.sm, color: theme.color.success,
    fontSize: 10, fontWeight: '900', paddingHorizontal: theme.spacing.sm, paddingVertical: 2,
  },
});
