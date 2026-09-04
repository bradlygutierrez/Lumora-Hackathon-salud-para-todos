import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { Button } from '@/src/shared/components/Button';
import { EmptyState, ErrorState, LoadingState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { TextField } from '@/src/shared/components/TextField';
import { theme } from '@/src/shared/constants/theme';
import {
  useProfessionalAgenda,
  useProfessionalAvailability,
  useProfessionalSchedules,
  useScheduleMutations,
} from '../hooks/use-appointments';
import type { ProfessionalSchedule } from '../types/appointment.types';
import {
  addDaysUtc,
  buildWeekDays,
  formatSectionHeader,
  formatWeekRange,
  groupByDate,
  startOfWeekUtc,
  toDateKey,
  weekdayShortLabel,
} from '../utils/agenda-week';
import { buildSchedulePayload, shortTime } from '../utils/schedule-form';
import { formatWorkspaceDateTime, formatWorkspaceTime } from '../utils/workspace-date-time';

const DAYS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}


const TODAY_KEY = toDateKey(new Date());

export function AgendaScreen() {
  const { permissions, session } = useAuthSession();
  const [section, setSection] = useState<'agenda' | 'availability'>('agenda');
  const [weekStart, setWeekStart] = useState(() => startOfWeekUtc(new Date()));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const weekDays = useMemo(() => buildWeekDays(weekStart), [weekStart]);
  const weekEnd = useMemo(() => addDaysUtc(weekStart, 7), [weekStart]);
  const agenda = useProfessionalAgenda({
    desde: weekStart.toISOString(),
    hasta: weekEnd.toISOString(),
  });
  const weekSections = useMemo(() => groupByDate(agenda.data ?? []), [agenda.data]);
  const visibleSections = useMemo(
    () =>
      selectedDay
        ? weekSections.filter((daySection) => daySection.dateKey === selectedDay)
        : weekSections,
    [weekSections, selectedDay],
  );
  const daysWithAppointments = useMemo(
    () => new Set(weekSections.map((daySection) => daySection.dateKey)),
    [weekSections],
  );
  const schedules = useProfessionalSchedules();
  const mutations = useScheduleMutations();
  const [date, setDate] = useState(todayIso());
  const availability = useProfessionalAvailability(date, section === 'availability');
  const [day, setDay] = useState(0);
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('12:00');
  const [editing, setEditing] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const scheduleByDay = useMemo(() => {
    const grouped = new Map<number, ProfessionalSchedule[]>();
    for (const item of schedules.data ?? []) {
      grouped.set(item.dia_semana, [...(grouped.get(item.dia_semana) ?? []), item]);
    }
    return grouped;
  }, [schedules.data]);

  if (!permissions.has('clinica:manage')) {
    return (
      <ErrorState
        title="Acceso restringido"
        message="No tenés permiso para administrar la agenda clínica."
      />
    );
  }

  const resetForm = () => {
    setEditing(null);
    setDay(0);
    setStart('08:00');
    setEnd('12:00');
    setFormError(null);
  };

  const submitSchedule = async () => {
    try {
      const payload = buildSchedulePayload(day, start, end);
      setFormError(null);
      if (editing) {
        await mutations.update.mutateAsync({ scheduleId: editing, payload });
      } else {
        await mutations.create.mutateAsync(payload);
      }
      resetForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar el horario.');
    }
  };

  const editSchedule = (item: ProfessionalSchedule) => {
    setEditing(item.id);
    setDay(item.dia_semana);
    setStart(shortTime(item.hora_inicio));
    setEnd(shortTime(item.hora_fin));
    setFormError(null);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heading}>
          <Text style={styles.title}>Agenda profesional</Text>
          <Text style={styles.subtitle}>
            Consultá tus próximas citas y administrá únicamente tu propia disponibilidad.
          </Text>
        </View>

        <View style={styles.tabs}>
          {([
            ['agenda', 'Mi agenda'],
            ['availability', 'Mi disponibilidad'],
          ] as const).map(([id, label]) => (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: section === id }}
              key={id}
              onPress={() => setSection(id)}
              style={[styles.tab, section === id ? styles.tabSelected : null]}
            >
              <Text style={[styles.tabText, section === id ? styles.tabTextSelected : null]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {section === 'agenda' ? (
          <>
            <View style={styles.weekNav}>
              <Pressable
                accessibilityLabel="Semana anterior"
                accessibilityRole="button"
                onPress={() => {
                  setWeekStart((current) => addDaysUtc(current, -7));
                  setSelectedDay(null);
                }}
                style={styles.weekNavButton}
              >
                <Text style={styles.weekNavButtonText}>‹</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setWeekStart(startOfWeekUtc(new Date()));
                  setSelectedDay(null);
                }}
              >
                <Text style={styles.weekRange}>{formatWeekRange(weekStart, addDaysUtc(weekStart, 6))}</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Semana siguiente"
                accessibilityRole="button"
                onPress={() => {
                  setWeekStart((current) => addDaysUtc(current, 7));
                  setSelectedDay(null);
                }}
                style={styles.weekNavButton}
              >
                <Text style={styles.weekNavButtonText}>›</Text>
              </Pressable>
            </View>

            <View style={styles.dayStrip}>
              {weekDays.map((day) => {
                const key = toDateKey(day);
                const isSelected = selectedDay === key;
                const isToday = key === TODAY_KEY;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    key={key}
                    onPress={() => setSelectedDay(isSelected ? null : key)}
                    style={[
                      styles.dayChip,
                      isSelected ? styles.dayChipSelected : null,
                      isToday && !isSelected ? styles.dayChipToday : null,
                    ]}
                  >
                    <Text
                      style={[styles.dayChipWeekday, isSelected ? styles.dayChipTextSelected : null]}
                    >
                      {weekdayShortLabel(day)}
                    </Text>
                    <Text
                      style={[styles.dayChipNumber, isSelected ? styles.dayChipTextSelected : null]}
                    >
                      {day.getUTCDate()}
                    </Text>
                    {daysWithAppointments.has(key) ? (
                      <View style={[styles.dayChipDot, isSelected ? styles.dayChipDotSelected : null]} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {agenda.isLoading ? <LoadingState title="Cargando la agenda de la semana" /> : null}
            {agenda.isError ? (
              <ErrorState
                title="No se pudo cargar la agenda"
                message="Verificá la conexión e intentá nuevamente."
              />
            ) : null}
            {!agenda.isLoading && !agenda.isError && visibleSections.length === 0 ? (
              <EmptyState
                title={selectedDay ? 'Sin citas este día' : 'Sin citas esta semana'}
                message={
                  selectedDay
                    ? 'No hay citas activas para el día seleccionado.'
                    : 'No hay citas activas en la semana seleccionada.'
                }
              />
            ) : null}
            <View style={styles.list}>
              {visibleSections.map((daySection) => (
                <View key={daySection.dateKey} style={styles.daySection}>
                  <Text style={styles.dayHeader}>{formatSectionHeader(daySection.dateKey)}</Text>
                  {daySection.items.map((item) => (
                    <View key={item.id} style={styles.card}>
                      <Text style={styles.cardTitle}>{item.paciente_nombre}</Text>
                      <Text style={styles.cardMeta}>{formatWorkspaceDateTime(item.inicio)}</Text>
                      <Text style={styles.cardMeta}>
                        {item.tipo_cita?.nombre ?? 'Tipo no indicado'} · {item.estado?.nombre ?? 'Estado no indicado'}
                      </Text>
                      {item.ubicacion ? (
                        <Text style={styles.cardMeta}>
                          {item.ubicacion.nombre}
                          {item.ubicacion.consultorio ? ` · ${item.ubicacion.consultorio}` : ''}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{editing ? 'Editar horario' : 'Agregar horario recurrente'}</Text>
              <Text style={styles.label}>Día de la semana</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.dayRow}>
                  {DAYS.map((label, index) => (
                    <Pressable
                      accessibilityRole="button"
                      key={label}
                      onPress={() => setDay(index)}
                      style={[styles.day, day === index ? styles.daySelected : null]}
                    >
                      <Text style={[styles.dayText, day === index ? styles.dayTextSelected : null]}>
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              <TextField
                accessibilityLabel="Hora de inicio"
                label="Inicio (HH:MM)"
                onChangeText={setStart}
                value={start}
              />
              <TextField
                accessibilityLabel="Hora final"
                label="Fin (HH:MM)"
                onChangeText={setEnd}
                value={end}
              />
              {formError ? <Text style={styles.error}>{formError}</Text> : null}
              <Button
                disabled={session?.isPreview}
                loading={mutations.create.isPending || mutations.update.isPending}
                onPress={submitSchedule}
              >
                {editing ? 'Guardar cambios' : 'Agregar horario'}
              </Button>
              {editing ? (
                <Button onPress={resetForm} variant="ghost">
                  Cancelar edición
                </Button>
              ) : null}
            </View>

            {schedules.isLoading ? <LoadingState title="Cargando disponibilidad" /> : null}
            {schedules.isError ? (
              <ErrorState
                title="No se pudo cargar la disponibilidad"
                message="Verificá la conexión e intentá nuevamente."
              />
            ) : null}
            {!schedules.isLoading && !schedules.isError && (schedules.data?.length ?? 0) === 0 ? (
              <EmptyState
                title="Sin horarios configurados"
                message="Agregá al menos un rango para publicar disponibilidad."
              />
            ) : null}

            {DAYS.map((label, index) => {
              const items = scheduleByDay.get(index) ?? [];
              if (!items.length) return null;
              return (
                <View key={label} style={styles.card}>
                  <Text style={styles.sectionTitle}>{label}</Text>
                  {items.map((item) => (
                    <View key={item.id} style={styles.scheduleRow}>
                      <View style={styles.scheduleText}>
                        <Text style={styles.cardTitle}>
                          {shortTime(item.hora_inicio)}–{shortTime(item.hora_fin)}
                        </Text>
                        <Text style={item.activo ? styles.active : styles.inactive}>
                          {item.activo ? 'Activo' : 'Inactivo'}
                        </Text>
                      </View>
                      <View style={styles.actions}>
                        <Button onPress={() => editSchedule(item)} variant="secondary">
                          Editar
                        </Button>
                        <Button
                          onPress={() =>
                            mutations.update.mutate({
                              scheduleId: item.id,
                              payload: { activo: !item.activo },
                            })
                          }
                          variant="secondary"
                        >
                          {item.activo ? 'Desactivar' : 'Activar'}
                        </Button>
                        <Button onPress={() => setPendingDelete(item.id)} variant="danger">
                          Eliminar
                        </Button>
                      </View>
                      {pendingDelete === item.id ? (
                        <View style={styles.confirm}>
                          <Text style={styles.cardMeta}>¿Eliminar este rango de disponibilidad?</Text>
                          <View style={styles.actions}>
                            <Button onPress={() => setPendingDelete(null)} variant="ghost">
                              Cancelar
                            </Button>
                            <Button
                              loading={mutations.remove.isPending}
                              onPress={async () => {
                                await mutations.remove.mutateAsync(item.id);
                                setPendingDelete(null);
                              }}
                              variant="danger"
                            >
                              Confirmar eliminación
                            </Button>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              );
            })}

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Comprobar slots publicados</Text>
              <TextField
                accessibilityLabel="Fecha de disponibilidad"
                label="Fecha (AAAA-MM-DD)"
                onChangeText={setDate}
                value={date}
              />
              {availability.isFetching ? <LoadingState title="Calculando slots" /> : null}
              {availability.isError ? (
                <Text style={styles.error}>No se pudo comprobar la disponibilidad.</Text>
              ) : null}
              {!availability.isFetching && availability.data?.slots.length === 0 ? (
                <Text style={styles.cardMeta}>No hay slots disponibles para esta fecha.</Text>
              ) : null}
              {availability.data?.slots.map((slot) => (
                <View key={slot.inicio} style={styles.slotRow}>
                  <Text style={styles.cardMeta}>
                    {formatWorkspaceTime(slot.inicio)}
                    {' – '}
                    {formatWorkspaceTime(slot.fin)}
                  </Text>
                  <Text style={slot.disponible ? styles.active : styles.inactive}>
                    {slot.disponible ? 'Disponible' : 'Ocupado'}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  heading: { gap: theme.spacing.xs },
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
  tabText: { color: theme.color.mutedText, fontWeight: '700', textAlign: 'center' },
  tabTextSelected: { color: theme.color.primary },
  card: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.softBorder,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  list: { gap: theme.spacing.lg },
  weekNav: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  weekNavButton: {
    alignItems: 'center',
    borderColor: theme.color.border,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  weekNavButtonText: { color: theme.color.text, fontSize: 18, fontWeight: '700' },
  weekRange: { color: theme.color.text, fontSize: theme.typography.body, fontWeight: '800' },
  dayStrip: { flexDirection: 'row', gap: theme.spacing.xs, justifyContent: 'space-between' },
  dayChip: {
    alignItems: 'center',
    borderColor: theme.color.softBorder,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    paddingVertical: theme.spacing.sm,
  },
  dayChipSelected: { backgroundColor: theme.color.primary, borderColor: theme.color.primary },
  dayChipToday: { borderColor: theme.color.primary },
  dayChipWeekday: {
    color: theme.color.mutedText,
    fontSize: theme.typography.caption,
    fontWeight: '700',
  },
  dayChipNumber: { color: theme.color.text, fontSize: theme.typography.body, fontWeight: '800' },
  dayChipTextSelected: { color: '#FFFFFF' },
  dayChipDot: {
    backgroundColor: theme.color.primary,
    borderRadius: theme.radius.pill,
    height: 5,
    width: 5,
  },
  dayChipDotSelected: { backgroundColor: '#FFFFFF' },
  daySection: { gap: theme.spacing.sm },
  dayHeader: { color: theme.color.text, fontSize: theme.typography.body, fontWeight: '800' },
  cardTitle: { color: theme.color.text, fontSize: 17, fontWeight: '800' },
  cardMeta: { color: theme.color.mutedText, fontSize: theme.typography.caption },
  sectionTitle: { color: theme.color.text, fontSize: 18, fontWeight: '900' },
  label: { color: theme.color.text, fontSize: theme.typography.caption, fontWeight: '700' },
  dayRow: { flexDirection: 'row', gap: theme.spacing.sm },
  day: {
    borderColor: theme.color.border,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
  },
  daySelected: { backgroundColor: theme.color.primary, borderColor: theme.color.primary },
  dayText: { color: theme.color.text, fontWeight: '700' },
  dayTextSelected: { color: '#FFFFFF' },
  scheduleRow: {
    borderTopColor: theme.color.softBorder,
    borderTopWidth: 1,
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
  },
  scheduleText: { gap: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  active: { color: theme.color.success, fontSize: theme.typography.caption, fontWeight: '800' },
  inactive: { color: theme.color.warning, fontSize: theme.typography.caption, fontWeight: '800' },
  confirm: {
    backgroundColor: theme.color.dangerSoft,
    borderRadius: theme.radius.md,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  error: { color: theme.color.danger, fontSize: theme.typography.caption },
  slotRow: {
    alignItems: 'center',
    borderTopColor: theme.color.softBorder,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.sm,
  },
});
