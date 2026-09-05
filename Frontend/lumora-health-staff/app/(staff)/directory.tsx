import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppTopBar } from '@/src/shared/components/AppTopBar';
import { PermissionGate } from '@/src/features/auth/components/PermissionGate';
import { useProfessionals } from '@/src/features/profile/hooks/use-professionals';
import { EmptyState, ErrorState, LoadingState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { TextField } from '@/src/shared/components/TextField';
import { theme } from '@/src/shared/constants/theme';
import { StaffAvatar } from '@/src/shared/components/StaffAvatar';

export default function MedicalDirectoryScreen() {
  const professionals = useProfessionals();
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('Todos');
  const specialties = useMemo(() => {
    const names = professionals.data?.items.map((item) => item.especialidad) ?? [];
    return ['Todos', ...Array.from(new Set(names)).slice(0, 5)];
  }, [professionals.data?.items]);
  const filteredProfessionals = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (
      professionals.data?.items.filter((professional) => {
        const fullName =
          `${professional.persona.nombres} ${professional.persona.apellidos}`.toLowerCase();
        const matchesSearch =
          !term ||
          fullName.includes(term) ||
          professional.especialidad.toLowerCase().includes(term) ||
          professional.numero_licencia.toLowerCase().includes(term);
        const matchesSpecialty =
          specialty === 'Todos' || professional.especialidad === specialty;
        return matchesSearch && matchesSpecialty;
      }) ?? []
    );
  }, [professionals.data?.items, search, specialty]);

  return (
    <Screen>
      <PermissionGate
        anyOf={['clinica:manage']}
        fallback={
          <ErrorState
            title="Acceso restringido"
            message="El directorio médico requiere permisos clínicos en la sesión."
          />
        }
      >
        <ScrollView contentContainerStyle={styles.container} style={styles.scroll}>
          <AppTopBar showBack />
          <View style={styles.header}>
            <Text style={styles.title}>Directorio de Personal Médico</Text>
            <Text style={styles.subtitle}>Consulta el personal clínico registrado.</Text>
          </View>
          <View style={styles.searchRow}>
            <View style={styles.searchField}>
              <TextField
                icon="search-outline"
                label="Buscar"
                onChangeText={setSearch}
                placeholder="Buscar por nombre, cargo, especialidad..."
                value={search}
              />
            </View>
            <View style={styles.filterButton}>
              <Ionicons color={theme.color.text} name="options-outline" size={24} />
            </View>
          </View>

          <Text style={styles.filterLabel}>Especialidad:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chips}>
              {specialties.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setSpecialty(item)}
                  style={[styles.chip, specialty === item ? styles.chipActive : null]}
                >
                  <Text
                    style={[styles.chipText, specialty === item ? styles.chipTextActive : null]}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {professionals.isLoading ? <LoadingState title="Cargando directorio" /> : null}
          {professionals.isError ? <ErrorState title="No se pudo cargar el directorio" /> : null}
          {professionals.data && filteredProfessionals.length === 0 ? (
            <EmptyState title="Sin profesionales registrados" />
          ) : null}

          {filteredProfessionals.map((professional) => (
            <Link href={`/(staff)/staff/${professional.id}`} key={professional.id} asChild>
              <Pressable style={styles.card}>
                <View style={styles.cardHeader}>
                  <StaffAvatar
                    firstName={professional.persona.nombres}
                    lastName={professional.persona.apellidos}
                    size={64}
                  />
                </View>
                <Text style={styles.name}>
                  {professional.persona.nombres} {professional.persona.apellidos}
                </Text>
                <Text style={styles.meta}>Licencia: {professional.numero_licencia}</Text>
                <View style={styles.divider} />
                <View style={styles.specialtyRow}>
                  <Ionicons color={theme.color.primary} name="heart-outline" size={18} />
                  <Text style={styles.specialtyText}>{professional.especialidad}</Text>
                  <Ionicons color={theme.color.primary} name="arrow-forward" size={22} />
                </View>
              </Pressable>
            </Link>
          ))}
        </ScrollView>
      </PermissionGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  title: {
    color: theme.color.text,
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    color: theme.color.mutedText,
    fontSize: theme.typography.body,
  },
  searchRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  searchField: {
    flex: 1,
  },
  filterButton: {
    alignItems: 'center',
    backgroundColor: theme.color.surfaceMuted,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  filterLabel: {
    color: theme.color.mutedText,
    fontSize: theme.typography.body,
    fontWeight: '800',
    marginTop: theme.spacing.xl,
  },
  chips: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  chip: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  chipActive: {
    backgroundColor: theme.color.primary,
    borderColor: theme.color.primary,
  },
  chipText: {
    color: theme.color.text,
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderLeftColor: '#10B981',
    borderLeftWidth: 4,
    padding: 24,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  statusPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.color.successSoft,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusDot: {
    backgroundColor: '#059669',
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  statusText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    backgroundColor: theme.color.border,
    height: 1,
    marginVertical: theme.spacing.lg,
  },
  specialtyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  specialtyText: {
    color: theme.color.primary,
    flex: 1,
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
  name: {
    color: theme.color.text,
    fontSize: 24,
    fontWeight: '800',
  },
  meta: {
    color: theme.color.mutedText,
    fontSize: theme.typography.body,
    marginTop: theme.spacing.xs,
  },
});
