import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatWorkspaceDateTime } from '@/src/features/appointments/utils/workspace-date-time';
import { useAuthSession } from '@/src/features/auth/hooks/use-auth-session';
import { useMedicalRecordSummary } from '@/src/features/medical-records/hooks/use-medical-record';
import {
  useMeasurementCatalogs,
  usePatientMeasurements,
} from '@/src/features/measurements/hooks/use-measurements';
import { enrichMeasurements } from '@/src/features/measurements/utils/measurement-format';
import { AppTopBar } from '@/src/shared/components/AppTopBar';
import { Button } from '@/src/shared/components/Button';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { theme } from '@/src/shared/constants/theme';
import { useMyPatients } from '../hooks/use-my-patients';
import { usePatient, usePatientCatalogs } from '../hooks/use-patients';
import {
  fullPatientName,
  patientAge,
  principalAddress,
} from '../utils/patient-format';

type Props = { patientId: number };

function formatDate(value: string | undefined) {
  if (!value) return 'No disponible';
  return new Intl.DateTimeFormat('es-NI', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function PatientDetailScreen({ patientId }: Props) {
  const router = useRouter();
  const { permissions } = useAuthSession();
  const patientQuery = usePatient(patientId);
  const catalogs = usePatientCatalogs();
  const clinicalSummary = useMedicalRecordSummary(patientId);
  const myPatients = useMyPatients();
  const measurements = usePatientMeasurements(patientId);
  const measurementCatalogs = useMeasurementCatalogs();

  const richSummary = clinicalSummary.data;
  const latestMeasurements = useMemo(
    () =>
      enrichMeasurements(
        measurements.data ?? [],
        measurementCatalogs.indicators.data ?? [],
        measurementCatalogs.units.data?.items ?? [],
        measurementCatalogs.origins.data?.items ?? [],
      ).slice(0, 5),
    [
      measurements.data,
      measurementCatalogs.indicators.data,
      measurementCatalogs.units.data?.items,
      measurementCatalogs.origins.data?.items,
    ],
  );
  const latestVital = useMemo(() => {
    const items = (richSummary?.consultas ?? []).flatMap(
      (item) => item.signos_vitales,
    );
    return [...items].sort(
      (a, b) =>
        new Date(b.registrado_at).getTime() -
        new Date(a.registrado_at).getTime(),
    )[0];
  }, [richSummary?.consultas]);

  if (!permissions.has('clinica:manage')) {
    return (
      <ErrorState
        title="Acceso restringido"
        message="No tenés permiso para consultar este paciente."
      />
    );
  }

  if (patientQuery.isLoading) {
    return <LoadingState title="Cargando paciente" />;
  }

  if (patientQuery.isError || !patientQuery.data) {
    return (
      <ErrorState
        title="No se pudo cargar el paciente"
        message="Verificá el acceso e intentá nuevamente."
      />
    );
  }

  const patient = patientQuery.data;
  const sex = catalogs.sexes.data?.items.find(
    (item) => item.id === patient.persona.sexo_id,
  )?.nombre;
  const bloodType = catalogs.bloodTypes.data?.items.find(
    (item) => item.id === patient.tipo_sangre_id,
  )?.nombre;
  const age = patientAge(patient.persona.fecha_nacimiento);
  const address = principalAddress(patient.persona.direcciones);
  const emergency = patient.contactos_emergencia[0];
  const workspacePatient = myPatients.data?.find(
    (item) => item.paciente.id === patientId,
  );
  const nextAppointment = workspacePatient?.proxima_cita;
  const lastConsultation = workspacePatient?.ultima_consulta;
  const allergies = richSummary?.alergias ?? [];

  return (
    <Screen>
      <AppTopBar />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Button
            accessibilityLabel="Volver a pacientes"
            icon="arrow-back"
            onPress={() => router.back()}
            variant="ghost"
          >
            Volver
          </Button>
          <Text style={styles.screenTitle}>Detalles del Paciente</Text>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.hero}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {patient.persona.nombres.slice(0, 1)}
                {patient.persona.apellidos.slice(0, 1)}
              </Text>
            </View>
            <View style={styles.heroText}>
              <Text style={styles.name}>
                {fullPatientName(
                  patient.persona.nombres,
                  patient.persona.apellidos,
                )}
              </Text>
              <View style={styles.metaWrap}>
                {age !== null ? (
                  <Meta icon="calendar-outline" text={`${age} años`} />
                ) : null}
                {sex ? <Meta icon="person-outline" text={sex} /> : null}
                {bloodType ? (
                  <Meta icon="water-outline" text={bloodType} />
                ) : null}
              </View>
              {clinicalSummary.data?.expediente ? (
                <View style={styles.recordBadge}>
                  <Ionicons
                    color={theme.color.primaryPressed}
                    name="folder-open-outline"
                    size={14}
                  />
                  <Text style={styles.recordBadgeText}>
                    {clinicalSummary.data.expediente.numero_expediente}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.primaryActions}>
            <View style={styles.actionItem}>
              <Button
                disabled={
                  clinicalSummary.isLoading || clinicalSummary.isError
                }
                icon="folder-open-outline"
                onPress={() =>
                  router.push(
                    `/(staff)/patients/${patientId}/record` as Href,
                  )
                }
              >
                Expediente Médico
              </Button>
            </View>
            <View style={styles.actionItem}>
              <Button
                accessibilityLabel="Abrir expediente documental del paciente"
                icon="document-text-outline"
                onPress={() =>
                  router.push(
                    `/(staff)/patients/${patientId}/record/document` as Href,
                  )
                }
                variant="secondary"
              >
                Documento clínico y PDF
              </Button>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.clinicalCard,
            allergies.length > 0 ? styles.clinicalCardAlert : null,
          ]}
        >
          <View style={styles.cardTitleRow}>
            <Ionicons
              color={
                allergies.length > 0
                  ? theme.color.danger
                  : theme.color.primary
              }
              name="pulse-outline"
              size={23}
            />
            <Text style={styles.cardTitle}>Resumen Clínico</Text>
          </View>
          {allergies.length > 0 ? (
            <View style={styles.allergyBox}>
              <View style={styles.allergyHeading}>
                <Ionicons
                  color={theme.color.danger}
                  name="warning-outline"
                  size={19}
                />
                <Text style={styles.allergyTitle}>Alergias registradas</Text>
              </View>
              {allergies.slice(0, 3).map((allergy) => (
                <View key={allergy.id} style={styles.allergyRow}>
                  <View style={styles.allergyCopy}>
                    <Text style={styles.allergyName}>{allergy.nombre}</Text>
                    {allergy.observaciones ? (
                      <Text style={styles.allergyObservation}>
                        {allergy.observaciones}
                      </Text>
                    ) : null}
                  </View>
                  <View accessibilityLabel="Alergia registrada" style={styles.allergyMarker}>
                    <Ionicons
                      color={theme.color.danger}
                      name="alert-circle"
                      size={16}
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.cardMuted}>
              No hay alergias reportadas en el resumen clínico.
            </Text>
          )}
        </View>

        <View style={styles.secondaryActions}>
          <Button
            accessibilityLabel="Ver recetas del paciente"
            icon="medkit-outline"
            onPress={() => {
              const recordId = clinicalSummary.data?.expediente?.id;
              const query = recordId ? `?recordId=${recordId}` : '';
              router.push(
                `/(staff)/patients/${patientId}/prescriptions${query}` as Href,
              );
            }}
            variant="secondary"
          >
            Recetas y medicamentos
          </Button>
          <Button
            icon="analytics-outline"
            onPress={() =>
              router.push(
                `/(staff)/patients/${patientId}/measurements` as Href,
              )
            }
            variant="secondary"
          >
            Ver historial de mediciones
          </Button>
          <Button
            icon="people-outline"
            onPress={() =>
              router.push(`/(staff)/patients/${patientId}/family` as Href)
            }
            variant="secondary"
          >
            Familiares y acceso
          </Button>
        </View>

        <InfoCard icon="calendar-outline" title="Seguimiento profesional">
          <InfoRow
            icon="calendar-number-outline"
            label="Próxima cita"
            value={formatWorkspaceDateTime(nextAppointment?.inicio)}
          />
          <InfoRow
            icon="time-outline"
            label="Última consulta"
            value={formatDate(lastConsultation?.fecha_consulta)}
          />
        </InfoCard>

        <InfoCard icon="pulse-outline" title="Últimos signos y mediciones" accent>
          {latestVital ? (
            <>
              {latestVital.presion_sistolica !== null &&
              latestVital.presion_diastolica !== null ? (
                <InfoRow
                  icon="heart-outline"
                  label="Presión arterial"
                  value={`${latestVital.presion_sistolica}/${latestVital.presion_diastolica} mmHg · ${formatDate(latestVital.registrado_at)}`}
                />
              ) : null}
              {latestVital.glucosa_mg_dl !== null ? (
                <InfoRow
                  icon="water-outline"
                  label="Glucosa"
                  value={`${latestVital.glucosa_mg_dl} mg/dL · ${formatDate(latestVital.registrado_at)}`}
                />
              ) : null}
              {latestVital.peso_kg !== null ? (
                <InfoRow
                  icon="fitness-outline"
                  label="Peso"
                  value={`${latestVital.peso_kg} kg · ${formatDate(latestVital.registrado_at)}`}
                />
              ) : null}
              {latestVital.saturacion_oxigeno !== null ? (
                <InfoRow
                  icon="pulse-outline"
                  label="SpO₂"
                  value={`${latestVital.saturacion_oxigeno}% · ${formatDate(latestVital.registrado_at)}`}
                />
              ) : null}
              {latestVital.temperatura_c !== null ? (
                <InfoRow
                  icon="thermometer-outline"
                  label="Temperatura"
                  value={`${latestVital.temperatura_c} °C · ${formatDate(latestVital.registrado_at)}`}
                />
              ) : null}
            </>
          ) : null}
          {latestMeasurements.map((item) => (
            <InfoRow
              icon="analytics-outline"
              key={item.id}
              label={item.indicador}
              value={`${item.valor} ${item.unidad} · ${formatDate(item.fecha_medicion)} · ${item.origen}`}
            />
          ))}
          {!latestVital && latestMeasurements.length === 0 ? (
            <EmptyState
              title="Sin signos o mediciones"
              message="Todavía no hay datos clínicos registrados para este paciente."
            />
          ) : null}
        </InfoCard>

        <InfoCard icon="person-outline" title="Información de Contacto">
          <InfoRow
            icon="call-outline"
            label="Teléfono"
            value={patient.persona.telefono ?? 'No indicado'}
          />
          <InfoRow
            icon="mail-outline"
            label="Correo"
            value={patient.persona.email ?? 'No indicado'}
          />
          <InfoRow
            icon="home-outline"
            label="Dirección"
            value={address ?? 'No indicada'}
          />
          {patient.persona.fecha_nacimiento ? (
            <InfoRow
              icon="calendar-outline"
              label="Fecha de nacimiento"
              value={patient.persona.fecha_nacimiento}
            />
          ) : null}
        </InfoCard>

        <InfoCard icon="medical-outline" title="Contacto de Emergencia">
          {emergency ? (
            <>
              <InfoRow
                icon="person-circle-outline"
                label={`Nombre (${emergency.parentesco})`}
                value={emergency.nombre}
              />
              <InfoRow
                icon="call-outline"
                label="Teléfono principal"
                value={emergency.telefono}
              />
              {emergency.email ? (
                <InfoRow
                  icon="mail-outline"
                  label="Correo"
                  value={emergency.email}
                />
              ) : null}
            </>
          ) : (
            <EmptyState
              title="Sin contacto de emergencia"
              message="No hay un contacto registrado para este paciente."
            />
          )}
        </InfoCard>
      </ScrollView>
    </Screen>
  );
}

type InfoCardProps = {
  accent?: boolean;
  children: React.ReactNode;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
};

function InfoCard({ accent, children, icon, title }: InfoCardProps) {
  return (
    <View style={[styles.card, accent ? styles.cardAccent : null]}>
      <View style={styles.cardTitleRow}>
        <View style={styles.cardIcon}>
          <Ionicons
            color={theme.color.primary}
            name={icon}
            size={21}
          />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons
          color={theme.color.primary}
          name={icon}
          size={19}
        />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function Meta({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.meta}>
      <Ionicons
        color={theme.color.mutedText}
        name={icon}
        size={16}
      />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    paddingTop: theme.spacing.lg,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  screenTitle: {
    color: theme.color.primary,
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  heroCard: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.softBorder,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
    shadowColor: '#003C90',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  hero: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.color.primarySoft,
    borderColor: theme.color.surface,
    borderRadius: 42,
    borderWidth: 3,
    height: 84,
    justifyContent: 'center',
    width: 84,
  },
  avatarText: {
    color: theme.color.info,
    fontSize: 25,
    fontWeight: '900',
  },
  heroText: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  name: {
    color: theme.color.text,
    fontSize: 27,
    fontWeight: '900',
  },
  metaWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  meta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  metaText: {
    color: theme.color.mutedText,
    fontSize: 14,
  },
  recordBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.color.primarySoft,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  recordBadgeText: {
    color: theme.color.primaryPressed,
    fontSize: 12,
    fontWeight: '900',
  },
  primaryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  actionItem: {
    flexBasis: 220,
    flexGrow: 1,
  },
  clinicalCard: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.softBorder,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  clinicalCardAlert: {
    borderLeftColor: theme.color.danger,
    borderLeftWidth: 6,
  },
  allergyBox: {
    backgroundColor: '#FFF4F2',
    borderColor: '#FFD0CB',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  allergyHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  allergyTitle: {
    color: theme.color.danger,
    fontSize: 14,
    fontWeight: '900',
  },
  allergyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  allergyCopy: {
    flex: 1,
    gap: 3,
  },
  allergyName: {
    color: theme.color.text,
    fontSize: 15,
    fontWeight: '800',
  },
  allergyObservation: {
    color: theme.color.mutedText,
    fontSize: 12,
    lineHeight: 17,
  },
  allergyMarker: {
    alignItems: 'center',
    backgroundColor: theme.color.dangerSoft,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  cardMuted: {
    color: theme.color.mutedText,
    fontSize: 13,
  },
  secondaryActions: {
    gap: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.color.surface,
    borderColor: theme.color.softBorder,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
    shadowColor: '#003C90',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardAccent: {
    borderLeftColor: theme.color.primary,
    borderLeftWidth: 5,
  },
  cardTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  cardIcon: {
    alignItems: 'center',
    backgroundColor: theme.color.primarySoft,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  cardTitle: {
    color: theme.color.text,
    fontSize: 20,
    fontWeight: '900',
  },
  cardBody: {
    gap: theme.spacing.lg,
  },
  infoRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  infoIcon: {
    alignItems: 'center',
    backgroundColor: theme.color.surfaceMuted,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  infoText: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    color: theme.color.mutedText,
    fontSize: 12,
  },
  infoValue: {
    color: theme.color.text,
    fontSize: 16,
  },
});
