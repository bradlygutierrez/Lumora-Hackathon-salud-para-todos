import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChoiceField } from '@/src/features/patients/components/ChoiceField';
import { Button } from '@/src/shared/components/Button';
import { EmptyState, ErrorState, LoadingState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { theme } from '@/src/shared/constants/theme';

export type StructuredRecordRow = {
  id: number;
  title: string;
  meta: string;
  detail?: string | null;
  activo: boolean;
};

type Props = {
  title: string;
  subtitle: string;
  createLabel: string;
  emptyTitle: string;
  emptyMessage: string;
  rows: StructuredRecordRow[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string | null;
  deleteError?: string | null;
  deleting?: boolean;
  filterValue: number;
  onFilterChange: (value: number | undefined) => void;
  offset: number;
  total: number;
  limit: number;
  onBack: () => void;
  onCreate: () => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onHistory?: (id: number) => void;
  onPrevious: () => void;
  onNext: () => void;
};

const filters = [
  { id: 1, nombre: 'Activos' },
  { id: 2, nombre: 'Inactivos' },
  { id: 3, nombre: 'Todos' },
];

export function StructuredRecordList({
  title,
  subtitle,
  createLabel,
  emptyTitle,
  emptyMessage,
  rows,
  isLoading,
  isError,
  errorMessage,
  deleteError,
  deleting,
  filterValue,
  onFilterChange,
  offset,
  total,
  limit,
  onBack,
  onCreate,
  onEdit,
  onDelete,
  onHistory,
  onPrevious,
  onNext,
}: Props) {
  if (isLoading) return <LoadingState title={`Cargando ${title.toLowerCase()}`} />;
  if (isError) {
    return (
      <ErrorState
        title={`No se pudo cargar ${title.toLowerCase()}`}
        message={errorMessage ?? 'Verificá la conexión y los permisos clínicos.'}
      />
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Button icon="arrow-back" onPress={onBack} variant="ghost">
          Volver al expediente
        </Button>

        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <Button accessibilityLabel={createLabel} icon="add" onPress={onCreate}>
            Añadir
          </Button>
        </View>

        <ChoiceField
          items={filters}
          label="Mostrar registros"
          onChange={onFilterChange}
          value={filterValue}
        />

        {deleteError ? (
          <View accessibilityRole="alert" style={styles.errorBox}>
            <Text style={styles.errorText}>{deleteError}</Text>
          </View>
        ) : null}

        {rows.length === 0 ? (
          <EmptyState title={emptyTitle} message={emptyMessage} />
        ) : (
          <View style={styles.list}>
            {rows.map((row) => (
              <View key={row.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardCopy}>
                    <Text style={styles.cardTitle}>{row.title}</Text>
                    <Text style={styles.cardMeta}>{row.meta}</Text>
                  </View>
                  <View style={[styles.badge, row.activo ? styles.activeBadge : styles.inactiveBadge]}>
                    <Text style={styles.badgeText}>{row.activo ? 'Activo' : 'Inactivo'}</Text>
                  </View>
                </View>
                {row.detail ? <Text style={styles.detail}>{row.detail}</Text> : null}
                <View style={styles.actions}>
                  <Button
                    accessibilityLabel={`Editar ${row.title}`}
                    onPress={() => onEdit(row.id)}
                    variant="secondary"
                  >
                    Editar
                  </Button>
                  {onHistory ? (
                    <Button
                      accessibilityLabel={`Ver historial de ${row.title}`}
                      onPress={() => onHistory(row.id)}
                      variant="secondary"
                    >
                      Historial
                    </Button>
                  ) : null}
                  <Button
                    accessibilityLabel={`Eliminar ${row.title}`}
                    disabled={deleting}
                    onPress={() => onDelete(row.id)}
                    variant="danger"
                  >
                    Eliminar
                  </Button>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.pagination}>
          <Button disabled={offset <= 0} onPress={onPrevious} variant="secondary">
            Anterior
          </Button>
          <Text style={styles.pageText}>
            {total === 0 ? '0' : `${offset + 1}-${Math.min(offset + rows.length, total)}`} de {total}
          </Text>
          <Button disabled={offset + limit >= total} onPress={onNext} variant="secondary">
            Siguiente
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.xl, paddingBottom: theme.spacing.xxl },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  headerCopy: { flex: 1, gap: 4, minWidth: 240 },
  title: { color: theme.color.text, fontSize: 26, fontWeight: '900' },
  subtitle: { color: theme.color.mutedText, fontSize: 14, lineHeight: 20 },
  list: { gap: theme.spacing.md },
  card: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.softBorder,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  cardTop: { alignItems: 'flex-start', flexDirection: 'row', gap: theme.spacing.md },
  cardCopy: { flex: 1, gap: 4 },
  cardTitle: { color: theme.color.text, fontSize: 17, fontWeight: '900' },
  cardMeta: { color: theme.color.mutedText, fontSize: 12, lineHeight: 18 },
  detail: { color: theme.color.text, fontSize: 14, lineHeight: 21 },
  badge: { borderRadius: theme.radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  activeBadge: { backgroundColor: theme.color.successSoft },
  inactiveBadge: { backgroundColor: theme.color.surfaceMuted },
  badgeText: { color: theme.color.text, fontSize: 11, fontWeight: '800' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  pagination: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  pageText: { color: theme.color.mutedText, flex: 1, fontSize: 12, textAlign: 'center' },
  errorBox: { backgroundColor: '#FFD7D2', borderRadius: theme.radius.md, padding: theme.spacing.md },
  errorText: { color: theme.color.danger, fontSize: 13, fontWeight: '700' },
});
