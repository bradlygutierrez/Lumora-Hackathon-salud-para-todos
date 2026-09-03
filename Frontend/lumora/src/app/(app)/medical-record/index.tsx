import { Text, View } from 'react-native';

import {
  useShareMedicalRecordPdf,
} from '@/features/medical-record/hooks/useMedicalRecordPdf';
import { useMedicalRecordDocument } from '@/features/medical-record/hooks/useMedicalRecordDocument';
import { MedicalRecordPdfUnavailableError } from '@/features/medical-record/utils/medical-record-pdf';
import type {
  AllergyEntry,
  ConditionEntry,
  ConsultationSummaryEntry,
  DisabilityEntry,
  MedicalHistoryEntry,
} from '@/features/medical-record/types/medical-record.types';
import { AppButton } from '@/shared/components/AppButton';
import { AppHeader } from '@/shared/components/AppHeader';
import { FullScreenApiError, FullScreenState } from '@/shared/components/FullScreenState';
import { Screen } from '@/shared/components/Screen';
import { useFeedback } from '@/shared/feedback/FeedbackProvider';

/** Formatea un ISO date/datetime del backend como "15 oct 2023". */
function formatShortDate(isoDate: string | null): string {
  if (!isoDate) return 'Sin fecha registrada';

  return new Intl.DateTimeFormat('es-NI', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(isoDate));
}

function formatDateTime(isoDate: string): string {
  return new Intl.DateTimeFormat('es-NI', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate));
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <Text className="text-lg font-semibold text-coal-900">{title}</Text>
      {children}
    </View>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <View className="rounded-2xl border border-bone-500 bg-bone-500 p-4">
      <Text className="text-sm text-coal-500">{message}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="rounded-2xl border border-bone-500 bg-white p-4">
      <Text className="text-sm font-semibold text-coal-900">{label}</Text>
      <Text className="mt-1 text-sm text-coal-500">{value}</Text>
    </View>
  );
}

/** "Expediente Médico" -- A15/B15. */
export default function MedicalRecordRoute() {
  const { document, isLoading, isError, error, refetch } = useMedicalRecordDocument();
  const { showFeedback } = useFeedback();
  const sharePdf = useShareMedicalRecordPdf();

  if (isLoading) {
    return (
      <FullScreenState
        title="Cargando tu expediente"
        message="Estamos preparando tu expediente médico."
      />
    );
  }

  if (isError || !document) {
    return <FullScreenApiError error={error} onRetry={refetch} allowRetry />;
  }

  const handleSharePdf = () => {
    sharePdf.mutate(document.paciente_id, {
      onError: (err) =>
        showFeedback(
          err instanceof MedicalRecordPdfUnavailableError
            ? err.message
            : 'No pudimos abrir el expediente. Intenta de nuevo.',
          'error',
        ),
    });
  };

  return (
    <Screen scrollable contentClassName="px-0 py-0">
      <AppHeader
        title="Expediente Médico"
        subtitle={`${document.paciente.nombres} ${document.paciente.apellidos}${
          document.expediente ? ` · N.º ${document.expediente.numero_expediente}` : ''
        }`}
      />

      <View className="gap-6 px-4 py-4">
        <View className="rounded-2xl border border-bone-500 bg-bone-500 p-4">
          <Text className="text-xs text-coal-500">
            Generado el {formatDateTime(document.generado_en)}
            {document.autor ? ` por ${document.autor}` : ''}
          </Text>
        </View>

        <View className="gap-3">
          <AppButton
            title={sharePdf.isPending ? 'Preparando PDF…' : 'Descargar / Ver PDF'}
            onPress={handleSharePdf}
            loading={sharePdf.isPending}
          />
        </View>

        <SectionCard title="Alergias">
          {document.alergias.length === 0 ? (
            <EmptyRow message="Sin alergias registradas." />
          ) : (
            document.alergias.map((alergia: AllergyEntry) => (
              <InfoRow
                key={alergia.id}
                label={alergia.nombre}
                value={alergia.observaciones ?? 'Sin observaciones adicionales.'}
              />
            ))
          )}
        </SectionCard>

        <SectionCard title="Discapacidades">
          {document.discapacidades.length === 0 ? (
            <EmptyRow message="Sin discapacidades registradas." />
          ) : (
            document.discapacidades.map((discapacidad: DisabilityEntry) => (
              <InfoRow
                key={discapacidad.id}
                label={discapacidad.nombre}
                value={discapacidad.observaciones ?? 'Sin observaciones adicionales.'}
              />
            ))
          )}
        </SectionCard>

        <SectionCard title="Condiciones médicas">
          {document.condiciones.length === 0 ? (
            <EmptyRow message="Sin condiciones médicas registradas." />
          ) : (
            document.condiciones.map((condicion: ConditionEntry) => (
              <InfoRow
                key={condicion.id}
                label={condicion.nombre}
                value={`Desde ${formatShortDate(condicion.fecha_inicio)}${
                  condicion.descripcion ? ` · ${condicion.descripcion}` : ''
                }`}
              />
            ))
          )}
        </SectionCard>

        <SectionCard title="Antecedentes">
          {document.antecedentes.length === 0 ? (
            <EmptyRow message="Sin antecedentes registrados." />
          ) : (
            document.antecedentes.map((antecedente: MedicalHistoryEntry) => (
              <InfoRow
                key={antecedente.id}
                label={formatShortDate(antecedente.fecha)}
                value={antecedente.descripcion}
              />
            ))
          )}
        </SectionCard>

        <SectionCard title="Consultas">
          {document.consultas.length === 0 ? (
            <EmptyRow message="Sin consultas registradas." />
          ) : (
            document.consultas.map((entry: ConsultationSummaryEntry) => {
              const ultimoSigno = entry.signos_vitales[entry.signos_vitales.length - 1];

              return (
                <View
                  key={entry.consulta.id}
                  className="gap-2 rounded-2xl border border-bone-500 bg-white p-4"
                >
                  <Text className="text-sm font-semibold text-coal-900">
                    {formatShortDate(entry.consulta.fecha_consulta)}
                    {entry.consulta.motivo ? ` · ${entry.consulta.motivo}` : ''}
                  </Text>

                  {entry.consulta.evaluacion ? (
                    <Text className="text-sm text-coal-500">{entry.consulta.evaluacion}</Text>
                  ) : null}

                  {entry.diagnosticos.length > 0 ? (
                    <Text className="text-sm text-coal-500">
                      Diagnósticos: {entry.diagnosticos.map((d) => d.descripcion).join(', ')}
                    </Text>
                  ) : null}

                  {ultimoSigno ? (
                    <Text className="text-xs text-coal-500">
                      Últimos signos vitales ({formatDateTime(ultimoSigno.registrado_at)}):{' '}
                      {[
                        ultimoSigno.presion_sistolica && ultimoSigno.presion_diastolica
                          ? `PA ${ultimoSigno.presion_sistolica}/${ultimoSigno.presion_diastolica}`
                          : null,
                        ultimoSigno.frecuencia_cardiaca ? `FC ${ultimoSigno.frecuencia_cardiaca}` : null,
                        ultimoSigno.temperatura_c ? `Temp ${ultimoSigno.temperatura_c}°C` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Sin valores registrados.'}
                    </Text>
                  ) : null}
                </View>
              );
            })
          )}
        </SectionCard>

        <SectionCard title="Recetas y medicación">
          {document.recetas.length === 0 ? (
            <EmptyRow message="Sin recetas registradas." />
          ) : (
            document.recetas.map((receta) => (
              <InfoRow
                key={receta.id}
                label={receta.titulo ?? 'Tratamiento'}
                value={`Emitida el ${formatShortDate(receta.fecha_emision)}${
                  receta.vigencia_hasta ? ` · Vigente hasta ${formatShortDate(receta.vigencia_hasta)}` : ''
                }`}
              />
            ))
          )}
        </SectionCard>

        <SectionCard title="Indicadores">
          {document.mediciones.length === 0 ? (
            <EmptyRow message="Sin mediciones registradas." />
          ) : (
            document.mediciones.map((medicion) => (
              <InfoRow
                key={medicion.id}
                label={medicion.indicador_nombre}
                value={`${medicion.valor} ${medicion.unidad_medida} · ${formatDateTime(medicion.fecha_medicion)}`}
              />
            ))
          )}
        </SectionCard>
      </View>
    </Screen>
  );
}
