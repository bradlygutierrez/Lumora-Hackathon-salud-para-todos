import { type Href, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { Button } from '@/src/shared/components/Button';
import { EmptyState, ErrorState, LoadingState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { theme } from '@/src/shared/constants/theme';
import {
  usePatientPrescriptions,
  usePrescriptionStatuses,
} from '../hooks/use-prescriptions';
import type { Prescription } from '../types/prescription.types';

type Tab = 'active' | 'history';

function professionalName(item: Prescription) {
  return `${item.profesional.persona.nombres} ${item.profesional.persona.apellidos}`.trim();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium' }).format(
    new Date(value),
  );
}

export function PrescriptionsScreen({
  patientId,
  recordId,
}: {
  patientId: number;
  recordId?: number;
}) {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const allowed = permissions.has('clinica:manage');
  const [tab, setTab] = useState<Tab>('active');
  const prescriptions = usePatientPrescriptions(patientId, allowed);
  const statuses = usePrescriptionStatuses(allowed);

  const activeStatus = useMemo(
    () =>
      statuses.data?.items.find(
        (item) => item.nombre.trim().toLocaleLowerCase() === 'activa',
      ),
    [statuses.data],
  );

  if (!allowed) {
    return (
      <ErrorState
        title="Acceso restringido"
        message="No tenés permiso para consultar recetas clínicas."
      />
    );
  }
  if (prescriptions.isLoading || statuses.isLoading) {
    return <LoadingState title="Cargando recetas" />;
  }
  if (prescriptions.isError) {
    return (
      <ErrorState
        title="Recetas no disponibles"
        message="No se pudieron consultar las recetas del paciente."
      />
    );
  }
  if (statuses.isError || !activeStatus) {
    return (
      <ErrorState
        title="Estados de receta no disponibles"
        message="No se pudo resolver el estado Activa desde el catálogo."
      />
    );
  }

  const statusById = new Map(
    (statuses.data?.items ?? []).map((item) => [item.id, item.nombre]),
  );
  const items = (prescriptions.data ?? []).filter((item) =>
    tab === 'active'
      ? item.estado_id === activeStatus.id
      : item.estado_id !== activeStatus.id,
  );

  const recordQuery = recordId ? `?recordId=${recordId}` : '';

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Button icon="arrow-back" onPress={() => router.back()} variant="ghost">
            Volver
          </Button>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>PACIENTE #{patientId}</Text>
            <Text style={styles.title}>Recetas y tratamientos</Text>
          </View>
        </View>

        <Button
          accessibilityLabel="Prescribir medicamento"
          icon="add-outline"
          onPress={() =>
            router.push(
              `/(staff)/patients/${patientId}/prescriptions/new${recordQuery}` as Href,
            )
          }
        >
          Prescribir medicamento
        </Button>

        <View style={styles.tabs}>
          <TabButton active={tab === 'active'} onPress={() => setTab('active')}>
            Activas
          </TabButton>
          <TabButton active={tab === 'history'} onPress={() => setTab('history')}>
            Historial
          </TabButton>
        </View>

        {items.length === 0 ? (
          <EmptyState
            title={tab === 'active' ? 'Sin recetas activas' : 'Sin historial de recetas'}
            message={
              tab === 'active'
                ? 'No hay tratamientos en estado Activa para este paciente.'
                : 'No hay recetas completadas, suspendidas o vencidas.'
            }
          />
        ) : null}

        {items.map((item) => (
          <Pressable
            accessibilityLabel={`Abrir receta ${item.titulo ?? item.id}`}
            accessibilityRole="button"
            key={item.id}
            onPress={() =>
              router.push(
                `/(staff)/patients/${patientId}/prescriptions/${item.id}${recordQuery}` as Href,
              )
            }
            style={styles.card}
          >
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>{item.titulo ?? 'Receta médica'}</Text>
              <Text style={styles.badge}>
                {statusById.get(item.estado_id) ?? `Estado #${item.estado_id}`}
              </Text>
            </View>
            <Text style={styles.meta}>
              {formatDate(item.fecha_emision)} · {professionalName(item)}
            </Text>
            <Text style={styles.meta}>
              {item.detalles.length} medicamento{item.detalles.length === 1 ? '' : 's'}
              {item.consulta_id ? ` · Consulta #${item.consulta_id}` : ''}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

function TabButton({
  active,
  children,
  onPress,
}: {
  active: boolean;
  children: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.tab, active ? styles.tabActive : null]}
    >
      <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  header: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  headerCopy: { flex: 1, gap: 2 },
  eyebrow: { color: theme.color.subtleText, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  title: { color: theme.color.text, fontSize: 24, fontWeight: '900' },
  tabs: {
    backgroundColor: theme.color.surfaceMuted,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    padding: 4,
  },
  tab: {
    alignItems: 'center',
    borderRadius: theme.radius.pill,
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 9,
  },
  tabActive: { backgroundColor: theme.color.primary },
  tabText: { color: theme.color.mutedText, fontSize: 13, fontWeight: '800' },
  tabTextActive: { color: '#FFFFFF' },
  card: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.softBorder,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  cardTop: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  cardTitle: { color: theme.color.text, flex: 1, fontSize: 16, fontWeight: '900' },
  badge: {
    backgroundColor: theme.color.primarySoft,
    borderRadius: theme.radius.pill,
    color: theme.color.info,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  meta: { color: theme.color.mutedText, fontSize: 12 },
});
