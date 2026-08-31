import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { AppTopBar } from '@/src/shared/components/AppTopBar';
import { Button } from '@/src/shared/components/Button';
import { EmptyState, ErrorState, LoadingState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { theme } from '@/src/shared/constants/theme';
import { ChoiceField } from '../components/ChoiceField';
import { MyPatientCard } from '../components/MyPatientCard';
import { PatientCard } from '../components/PatientCard';
import { useMyPatients } from '../hooks/use-my-patients';
import { usePatientCatalogs, usePatients } from '../hooks/use-patients';

const PAGE_SIZE = 10;

export function PatientListScreen() {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const [mode, setMode] = useState<'mine' | 'search'>('mine');
  const [search, setSearch] = useState('');
  const [sexId, setSexId] = useState<number | undefined>();
  const [bloodTypeId, setBloodTypeId] = useState<number | undefined>();
  const [offset, setOffset] = useState(0);

  const myPatients = useMyPatients();
  const patients = usePatients({
    search: search.trim() || undefined,
    sexo_id: sexId,
    tipo_sangre_id: bloodTypeId,
    limit: PAGE_SIZE,
    offset,
  });
  const catalogs = usePatientCatalogs();

  const sexNames = useMemo(
    () => new Map((catalogs.sexes.data?.items ?? []).map((item) => [item.id, item.nombre])),
    [catalogs.sexes.data?.items],
  );
  const bloodTypeNames = useMemo(
    () => new Map((catalogs.bloodTypes.data?.items ?? []).map((item) => [item.id, item.nombre])),
    [catalogs.bloodTypes.data?.items],
  );

  if (!permissions.has('clinica:manage')) {
    return <ErrorState title="Acceso restringido" message="No tenés permiso para consultar pacientes." />;
  }

  const page = patients.data;
  const hasPrevious = offset > 0;
  const hasNext = Boolean(page && offset + page.items.length < page.total);

  return (
    <Screen>
      <AppTopBar />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Pacientes</Text>
          <Text style={styles.subtitle}>
            Consultá tus pacientes vinculados o buscá dentro del directorio autorizado.
          </Text>
        </View>

        <View style={styles.tabs}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === 'mine' }}
            onPress={() => setMode('mine')}
            style={[styles.tab, mode === 'mine' ? styles.tabSelected : null]}
          >
            <Text style={styles.tabText}>Mis pacientes</Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === 'search' }}
            onPress={() => setMode('search')}
            style={[styles.tab, mode === 'search' ? styles.tabSelected : null]}
          >
            <Text style={styles.tabText}>Buscar pacientes</Text>
          </Pressable>
        </View>

        {mode === 'mine' ? (
          <>
            {myPatients.isLoading ? <LoadingState title="Cargando mis pacientes" /> : null}
            {myPatients.isError ? (
              <ErrorState
                title="No se pudieron cargar tus pacientes"
                message="Verificá la conexión o los permisos e intentá nuevamente."
              />
            ) : null}
            {!myPatients.isLoading && !myPatients.isError && (myPatients.data?.length ?? 0) === 0 ? (
              <EmptyState
                title="Sin pacientes vinculados"
                message="Tus pacientes aparecerán cuando exista una cita o consulta real con vos."
              />
            ) : null}
            <View style={styles.list}>
              {myPatients.data?.map((item) => (
                <MyPatientCard
                  item={item}
                  key={item.paciente.id}
                  onPress={() =>
                    router.push(`/(staff)/patients/${item.paciente.id}` as Href)
                  }
                />
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={styles.searchShell}>
              <Ionicons color={theme.color.mutedText} name="search-outline" size={20} />
              <TextInput
                accessibilityLabel="Buscar pacientes"
                onChangeText={(value) => {
                  setSearch(value);
                  setOffset(0);
                }}
                placeholder="Buscar por nombre, teléfono o correo..."
                placeholderTextColor={theme.color.subtleText}
                style={styles.searchInput}
                value={search}
              />
              {search ? (
                <Pressable
                  accessibilityLabel="Limpiar búsqueda"
                  accessibilityRole="button"
                  onPress={() => {
                    setSearch('');
                    setOffset(0);
                  }}
                >
                  <Ionicons color={theme.color.mutedText} name="close-circle" size={20} />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.filtersCard}>
              <ChoiceField
                clearLabel="Todos"
                items={catalogs.sexes.data?.items ?? []}
                label="Sexo"
                onChange={(value) => {
                  setSexId(value);
                  setOffset(0);
                }}
                optional
                value={sexId}
              />
              <ChoiceField
                clearLabel="Todos"
                items={catalogs.bloodTypes.data?.items ?? []}
                label="Tipo de sangre"
                onChange={(value) => {
                  setBloodTypeId(value);
                  setOffset(0);
                }}
                optional
                value={bloodTypeId}
              />
              {catalogs.sexes.isError || catalogs.bloodTypes.isError ? (
                <Text style={styles.filterWarning}>Algunos filtros no pudieron cargarse.</Text>
              ) : null}
            </View>

            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Directorio autorizado</Text>
              {page ? <Text style={styles.total}>{page.total} resultado(s)</Text> : null}
            </View>

            {patients.isLoading ? <LoadingState title="Cargando pacientes" /> : null}
            {patients.isError ? (
              <ErrorState
                title="No se pudo cargar la lista"
                message="Verificá la conexión o los permisos e intentá nuevamente."
              />
            ) : null}
            {!patients.isLoading && !patients.isError && page?.items.length === 0 ? (
              <EmptyState
                title="No se encontraron pacientes"
                message="Probá con otra búsqueda o quitá los filtros."
              />
            ) : null}

            {!patients.isLoading && !patients.isError ? (
              <View style={styles.list}>
                {page?.items.map((patient) => (
                  <PatientCard
                    bloodTypeName={
                      patient.tipo_sangre_id ? bloodTypeNames.get(patient.tipo_sangre_id) : undefined
                    }
                    key={patient.id}
                    onPress={() => router.push(`/(staff)/patients/${patient.id}` as Href)}
                    patient={patient}
                    sexName={patient.persona.sexo_id ? sexNames.get(patient.persona.sexo_id) : undefined}
                  />
                ))}
              </View>
            ) : null}

            {page && page.total > PAGE_SIZE ? (
              <View style={styles.pagination}>
                <Button
                  disabled={!hasPrevious}
                  onPress={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
                  variant="secondary"
                >
                  Anterior
                </Button>
                <Text style={styles.pageText}>
                  {Math.floor(offset / PAGE_SIZE) + 1} / {Math.max(1, Math.ceil(page.total / PAGE_SIZE))}
                </Text>
                <Button
                  disabled={!hasNext}
                  onPress={() => setOffset((current) => current + PAGE_SIZE)}
                  variant="secondary"
                >
                  Siguiente
                </Button>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      {mode === 'search' ? (
        <Pressable
          accessibilityLabel="Registrar paciente"
          accessibilityRole="button"
          onPress={() => router.push('/(staff)/patients/new' as Href)}
          style={styles.fab}
        >
          <Ionicons color="#FFFFFF" name="add" size={30} />
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg, paddingBottom: 90, paddingTop: theme.spacing.xl },
  titleBlock: { gap: theme.spacing.xs },
  title: { color: theme.color.text, fontSize: 26, fontWeight: '900' },
  subtitle: { color: theme.color.mutedText, fontSize: 14 },
  tabs: {
    backgroundColor: theme.color.surfaceMuted,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    padding: 4,
  },
  tab: { flex: 1, padding: 12 },
  tabSelected: { backgroundColor: theme.color.surface, borderRadius: theme.radius.sm },
  tabText: { color: theme.color.text, fontWeight: '800', textAlign: 'center' },
  searchShell: {
    alignItems: 'center',
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 50,
    paddingHorizontal: theme.spacing.md,
  },
  searchInput: { color: theme.color.text, flex: 1, fontSize: 15, minHeight: 48 },
  filtersCard: {
    backgroundColor: theme.color.surfaceMuted,
    borderColor: theme.color.softBorder,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  filterWarning: { color: theme.color.warning, fontSize: theme.typography.caption },
  resultsHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  resultsTitle: { color: theme.color.text, fontSize: 18, fontWeight: '800' },
  total: { color: theme.color.subtleText, fontSize: theme.typography.caption },
  list: { gap: theme.spacing.md },
  pagination: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  pageText: { color: theme.color.mutedText, fontSize: theme.typography.caption, fontWeight: '700' },
  fab: {
    alignItems: 'center',
    backgroundColor: theme.color.primary,
    borderRadius: 18,
    bottom: theme.spacing.lg,
    height: 58,
    justifyContent: 'center',
    position: 'absolute',
    right: theme.spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 7,
    width: 58,
  },
});
