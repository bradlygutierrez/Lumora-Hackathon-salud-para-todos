from collections import defaultdict
from datetime import timezone, datetime
from typing import Any

from lumora_api.core.exceptions import ResourceNotFoundError
from lumora_api.models import (
    EstadoCondicion, EstadoExpediente, EstadoReceta, MotivoConsulta,
    NivelSeveridad, OrigenRegistro, Sexo, TipoAntecedente, TipoDiagnostico,
    TipoSangre, UnidadMedida, ViaAdministracion,
)
from lumora_api.repositories.clinical_integration_repository import ClinicalIntegrationRepository
from lumora_api.schemas.medical_record_document import (
    AllergyDocumentRead, CatalogRef, ConditionDocumentRead,
    ConsultationDocumentRead, DiagnosisDocumentRead, DisabilityDocumentRead,
    HistoryDocumentRead, MedicalRecordDocumentRead, MeasurementDocumentRead,
    MedicationDocumentRead, PatientDocumentRead, PrescriptionDetailDocumentRead,
    PrescriptionDocumentRead, ProfessionalDocumentRead, RecordDocumentRead,
    VitalSignsDocumentRead,
)


class MedicalRecordDocumentService:
    def __init__(self, repository: ClinicalIntegrationRepository) -> None:
        self.repository = repository

    async def build(self, patient_id: int) -> MedicalRecordDocumentRead:
        patient = await self.repository.get_patient(patient_id)
        if patient is None:
            raise ResourceNotFoundError(f'Paciente con id {patient_id} no existe')
        record = await self.repository.active_record_for_patient(patient_id)
        data = await self.repository.document_payload(patient, record)
        catalogs = data['catalogs']
        professionals = {
            key: ProfessionalDocumentRead(
                id=item.id, nombre_completo=item.full_name, especialidad=item.especialidad
            ) for key, item in data['professionals'].items()
        }
        vital_signs = defaultdict(list)
        for item in data['vital_signs']:
            vital_signs[item.consulta_id].append(VitalSignsDocumentRead.model_validate(item, from_attributes=True))
        diagnoses = defaultdict(list)
        for item in data['diagnoses']:
            diagnoses[item.consulta_id].append(DiagnosisDocumentRead(
                id=item.id, descripcion=item.descripcion,
                tipo=self._catalog(catalogs, TipoDiagnostico, item.tipo_diagnostico_id),
                es_principal=item.es_principal, fecha_diagnostico=item.fecha_diagnostico,
                profesional=professionals[item.profesional_id],
            ))
        person = patient.persona
        return MedicalRecordDocumentRead(
            generated_at=datetime.now(timezone.utc),
            paciente=PatientDocumentRead(
                id=patient.id, nombres=person.nombres, apellidos=person.apellidos,
                fecha_nacimiento=person.fecha_nacimiento,
                sexo=self._optional_catalog(catalogs, Sexo, person.sexo_id),
                tipo_sangre=self._optional_catalog(catalogs, TipoSangre, patient.tipo_sangre_id),
            ),
            expediente=None if record is None else RecordDocumentRead(
                id=record.id, numero_expediente=record.numero_expediente,
                estado=self._catalog(catalogs, EstadoExpediente, record.estado_expediente_id),
                fecha_apertura=record.created_at,
            ),
            antecedentes=[HistoryDocumentRead(
                id=item.id, tipo=self._catalog(catalogs, TipoAntecedente, item.tipo_antecedente_id),
                descripcion=item.descripcion, fecha=item.fecha,
            ) for item in data['histories']],
            alergias=[AllergyDocumentRead(
                id=item.id, nombre=item.nombre,
                severidad=self._optional_catalog(catalogs, NivelSeveridad, item.nivel_severidad_id),
                estado=self._optional_catalog(catalogs, EstadoCondicion, item.estado_condicion_id),
                observaciones=item.observaciones,
            ) for item in data['allergies']],
            discapacidades=[DisabilityDocumentRead(
                id=item.id, nombre=item.nombre,
                estado=self._optional_catalog(catalogs, EstadoCondicion, item.estado_condicion_id),
                observaciones=item.observaciones,
            ) for item in data['disabilities']],
            condiciones=[ConditionDocumentRead(
                id=item.id, nombre=item.nombre, descripcion=item.descripcion,
                estado=self._catalog(catalogs, EstadoCondicion, item.estado_condicion_id),
                diagnostico_id=item.diagnostico_id, fecha_inicio=item.fecha_inicio,
                fecha_fin=item.fecha_fin,
            ) for item in data['conditions']],
            consultas=[ConsultationDocumentRead(
                id=item.id, fecha_consulta=item.fecha_consulta, motivo=item.motivo,
                motivo_consulta=self._optional_catalog(catalogs, MotivoConsulta, item.motivo_consulta_id),
                sintomas=item.sintomas, evaluacion=item.evaluacion,
                indicaciones=item.indicaciones, observaciones=item.observaciones,
                profesional=professionals[item.profesional_id],
                signos_vitales=vital_signs[item.id], diagnosticos=diagnoses[item.id],
            ) for item in data['consultations']],
            recetas=[self._prescription(item, catalogs, professionals) for item in data['prescriptions']],
            indicadores=[MeasurementDocumentRead(
                id=row['measurement'].id,
                indicador_id=row['measurement'].indicador_id,
                indicador_nombre=row['indicador_nombre'], valor=row['measurement'].valor,
                unidad_medida=CatalogRef(id=row['measurement'].unidad_medida_id, nombre=row['unidad_nombre']),
                origen_registro=CatalogRef(id=row['measurement'].origen_registro_id, nombre=row['origen_nombre']),
                fecha_medicion=row['measurement'].fecha_medicion,
                observaciones=row['measurement'].observaciones,
            ) for row in data['measurements']],
        )

    @staticmethod
    def _catalog(catalogs: dict, model: type, item_id: int) -> CatalogRef:
        item = catalogs[model][item_id]
        return CatalogRef(id=item.id, nombre=item.nombre)

    @classmethod
    def _optional_catalog(cls, catalogs: dict, model: type, item_id: int | None) -> CatalogRef | None:
        return None if item_id is None else cls._catalog(catalogs, model, item_id)

    @classmethod
    def _prescription(cls, item: Any, catalogs: dict, professionals: dict) -> PrescriptionDocumentRead:
        return PrescriptionDocumentRead(
            id=item.id, titulo=item.titulo,
            estado=cls._catalog(catalogs, EstadoReceta, item.estado_id),
            fecha_emision=item.fecha_emision, vigencia_hasta=item.vigencia_hasta,
            observaciones=item.observaciones, consulta_id=item.consulta_id,
            profesional=professionals[item.profesional_id],
            detalles=[PrescriptionDetailDocumentRead(
                id=detail.id,
                medicamento=MedicationDocumentRead(
                    id=detail.medicamento.id, nombre=detail.medicamento.nombre,
                    nombre_generico=detail.medicamento.nombre_generico,
                    presentacion=detail.medicamento.presentacion,
                    concentracion=detail.medicamento.concentracion,
                ),
                dosis=detail.dosis, frecuencia=detail.frecuencia,
                duracion_dias=detail.duracion_dias, cantidad_total=detail.cantidad_total,
                instrucciones=detail.instrucciones,
                unidad_medida=cls._catalog(catalogs, UnidadMedida, detail.unidad_medida_id),
                via_administracion=cls._catalog(catalogs, ViaAdministracion, detail.via_administracion_id),
            ) for detail in item.detalles],
        )
