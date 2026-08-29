import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { useCurrentProfessional } from '@/src/features/profile/hooks/use-professionals';
import { Button } from '@/src/shared/components/Button';
import { EmptyState, ErrorState, LoadingState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { TextField } from '@/src/shared/components/TextField';
import { theme } from '@/src/shared/constants/theme';
import { useConsultations } from '../hooks/use-consultations';
import type { Consultation } from '../types/consultation.types';

const PAGE_SIZE = 10;
type ActiveFilter = 'all' | 'active' | 'inactive';

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

export function ConsultationHistoryScreen({ patientId, recordId }: { patientId: number; recordId: number }) {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const currentProfessional = useCurrentProfessional();
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active');
  const [mineOnly, setMineOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [offset, setOffset] = useState(0);

  const consultations = useConsultations({
    expediente_id: recordId,
    paciente_id: patientId,
    profesional_id: mineOnly ? currentProfessional.data?.id : undefined,
    activo: activeFilter === 'all' ? undefined : activeFilter === 'active',
    fecha_desde: dateFrom.trim() || undefined,
    fecha_hasta: dateTo.trim() || undefined,
    limit: PAGE_SIZE,
    offset,
  });

  if (!permissions.has('clinica:manage')) {
    return <ErrorState title="Acceso restringido" message="No tenés permiso para consultar atenciones clínicas." />;
  }
  if (mineOnly && currentProfessional.isLoading) return <LoadingState title="Identificando profesional" />;
  if (mineOnly && (currentProfessional.isError || !currentProfessional.data)) {
    return <ErrorState title="Perfil profesional no disponible" message="No se pudo vincular la sesión con un profesional de salud." />;
  }

  const page = consultations.data;
  const hasPrevious = offset > 0;
  const hasNext = Boolean(page && offset + page.items.length < page.total);

  const setFilter = (value: ActiveFilter) => {
    setActiveFilter(value);
    setOffset(0);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Button icon="arrow-back" onPress={() => router.back()} variant="ghost">Volver</Button>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>EXPEDIENTE #{recordId}</Text>
            <Text style={styles.title}>Consultas clínicas</Text>
          </View>
        </View>

        <View style={styles.filtersCard}>
          <Text style={styles.filterTitle}>Filtros</Text>
          <View style={styles.chips}>
            {([['active', 'Activas'], ['inactive', 'Inactivas'], ['all', 'Todas']] as const).map(([value, label]) => (
              <Pressable
                accessibilityRole="button"
                key={value}
                onPress={() => setFilter(value)}
                style={[styles.chip, activeFilter === value ? styles.chipSelected : null]}
              >
                <Text style={[styles.chipText, activeFilter === value ? styles.chipTextSelected : null]}>{label}</Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityLabel="Filtrar mis consultas"
              accessibilityRole="button"
              onPress={() => { setMineOnly((value) => !value); setOffset(0); }}
              style={[styles.chip, mineOnly ? styles.chipSelected : null]}
            >
              <Text style={[styles.chipText, mineOnly ? styles.chipTextSelected : null]}>Mis consultas</Text>
            </Pressable>
          </View>
          <TextField
            accessibilityLabel="Fecha desde"
            label="Fecha desde"
            onChangeText={(value) => { setDateFrom(value); setOffset(0); }}
            placeholder="2026-08-01T00:00:00Z"
            value={dateFrom}
          />
          <TextField
            accessibilityLabel="Fecha hasta"
            label="Fecha hasta"
            onChangeText={(value) => { setDateTo(value); setOffset(0); }}
            placeholder="2026-08-31T23:59:59Z"
            value={dateTo}
          />
        </View>

        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>Historial</Text>
          {page ? <Text style={styles.total}>{page.total} registro(s)</Text> : null}
        </View>

        {consultations.isLoading ? <LoadingState title="Cargando consultas" /> : null}
        {consultations.isError ? <ErrorState title="No se pudieron cargar las consultas" message="Verificá los filtros, la conexión y tus permisos clínicos." /> : null}
        {!consultations.isLoading && !consultations.isError && page?.items.length === 0 ? (
          <EmptyState title="Sin consultas" message="No hay registros para los filtros seleccionados." />
        ) : null}

        <View style={styles.list}>
          {page?.items.map((item) => (
            <ConsultationCard
              consultation={item}
              key={item.id}
              onPress={() => router.push(`/(staff)/patients/${patientId}/record/consultations/${item.id}` as Href)}
            />
          ))}
        </View>

        {page && page.total > PAGE_SIZE ? (
          <View style={styles.pagination}>
            <Button disabled={!hasPrevious} onPress={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))} variant="secondary">Anterior</Button>
            <Text style={styles.pageText}>{Math.floor(offset / PAGE_SIZE) + 1} / {Math.max(1, Math.ceil(page.total / PAGE_SIZE))}</Text>
            <Button disabled={!hasNext} onPress={() => setOffset((value) => value + PAGE_SIZE)} variant="secondary">Siguiente</Button>
          </View>
        ) : null}

        <Button
          accessibilityLabel="Crear consulta clínica"
          icon="add-circle-outline"
          onPress={() => router.push(`/(staff)/patients/${patientId}/record/consultations/new?recordId=${recordId}` as Href)}
        >
          Nueva consulta
        </Button>
      </ScrollView>
    </Screen>
  );
}

function ConsultationCard({ consultation, onPress }: { consultation: Consultation; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}>
      <View style={styles.cardTop}>
        <View style={styles.cardIcon}><Ionicons color={theme.color.primaryPressed} name="medkit-outline" size={20} /></View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{consultation.motivo ?? 'Consulta médica'}</Text>
          <Text style={styles.cardMeta}>{formatDateTime(consultation.fecha_consulta)} · Profesional #{consultation.profesional_id}</Text>
        </View>
        <Text style={[styles.status, consultation.activo ? styles.active : styles.inactive]}>{consultation.activo ? 'Activa' : 'Inactiva'}</Text>
      </View>
      {consultation.evaluacion ? <Text numberOfLines={2} style={styles.cardDetail}>{consultation.evaluacion}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  headerRow: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  headerCopy: { flex: 1, gap: 2 },
  eyebrow: { color: theme.color.subtleText, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  title: { color: theme.color.text, fontSize: 26, fontWeight: '900' },
  filtersCard: { backgroundColor: theme.color.surfaceMuted, borderColor: theme.color.softBorder, borderRadius: theme.radius.lg, borderWidth: 1, gap: theme.spacing.md, padding: theme.spacing.md },
  filterTitle: { color: theme.color.text, fontSize: 16, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  chip: { backgroundColor: theme.color.surface, borderColor: theme.color.border, borderRadius: theme.radius.pill, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  chipSelected: { backgroundColor: theme.color.primary, borderColor: theme.color.primary },
  chipText: { color: theme.color.text, fontSize: 12, fontWeight: '700' },
  chipTextSelected: { color: '#FFFFFF' },
  resultsHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  resultsTitle: { color: theme.color.text, fontSize: 18, fontWeight: '800' },
  total: { color: theme.color.subtleText, fontSize: 12 },
  list: { gap: theme.spacing.md },
  card: { backgroundColor: theme.color.surface, borderColor: theme.color.softBorder, borderRadius: theme.radius.lg, borderWidth: 1, gap: theme.spacing.sm, padding: theme.spacing.lg },
  pressed: { opacity: 0.76 },
  cardTop: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  cardIcon: { alignItems: 'center', backgroundColor: theme.color.primarySoft, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  cardCopy: { flex: 1, gap: 3 },
  cardTitle: { color: theme.color.text, fontSize: 16, fontWeight: '900' },
  cardMeta: { color: theme.color.mutedText, fontSize: 12 },
  cardDetail: { color: theme.color.mutedText, fontSize: 13, lineHeight: 19 },
  status: { borderRadius: theme.radius.pill, fontSize: 11, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 5 },
  active: { backgroundColor: '#DDF4E4', color: theme.color.success },
  inactive: { backgroundColor: theme.color.surfaceMuted, color: theme.color.subtleText },
  pagination: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm, justifyContent: 'space-between' },
  pageText: { color: theme.color.mutedText, fontSize: 12, fontWeight: '700' },
});
