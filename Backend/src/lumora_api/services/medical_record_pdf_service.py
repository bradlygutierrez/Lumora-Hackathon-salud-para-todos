from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from lumora_api.schemas.medical_record_document import MedicalRecordDocumentRead


def safe_text(value: object | None) -> str:
    return escape('' if value is None else str(value)).replace('\n', '<br/>')


class MedicalRecordPdfService:
    def render(self, document: MedicalRecordDocumentRead) -> bytes:
        output = BytesIO()
        styles = getSampleStyleSheet()
        story = [
            Paragraph('Expediente clínico', styles['Title']),
            Paragraph(f'Generado: {safe_text(document.generated_at.isoformat())}', styles['Normal']),
            Spacer(1, 5 * mm),
        ]

        def section(title: str, rows: list[list[object]]) -> None:
            story.append(Paragraph(safe_text(title), styles['Heading2']))
            if not rows:
                story.append(Paragraph('Sin registros', styles['Normal']))
            else:
                for row in rows:
                    story.append(Paragraph(f'<b>{safe_text(row[0])}</b>', styles['BodyText']))
                    for cell in row[1:]:
                        story.append(Paragraph(safe_text(cell), styles['BodyText']))
                    story.append(Spacer(1, 2 * mm))
            story.append(Spacer(1, 4 * mm))

        patient = document.paciente
        section('Paciente', [[
            'Nombre', f'{patient.nombres} {patient.apellidos}'
        ], ['Fecha de nacimiento', patient.fecha_nacimiento],
           ['Sexo', patient.sexo.nombre if patient.sexo else None],
           ['Tipo de sangre', patient.tipo_sangre.nombre if patient.tipo_sangre else None]])
        record = document.expediente
        section('Expediente', [] if record is None else [
            ['Número', record.numero_expediente], ['Estado', record.estado.nombre],
            ['Fecha de apertura', record.fecha_apertura],
        ])
        section('Antecedentes', [[item.tipo.nombre, f'{item.descripcion}\nFecha: {item.fecha or "—"}'] for item in document.antecedentes])
        section('Alergias', [[item.nombre, f'Severidad: {item.severidad.nombre if item.severidad else "—"}\nEstado: {item.estado.nombre if item.estado else "—"}\n{item.observaciones or ""}'] for item in document.alergias])
        section('Discapacidades', [[item.nombre, f'Estado: {item.estado.nombre if item.estado else "—"}\n{item.observaciones or ""}'] for item in document.discapacidades])
        section('Condiciones', [[item.nombre, f'Estado: {item.estado.nombre}\n{item.descripcion or ""}\nInicio: {item.fecha_inicio or "—"} · Fin: {item.fecha_fin or "—"}'] for item in document.condiciones])
        consultation_rows = []
        for item in document.consultas:
            vitals = '\n'.join(
                f'T° {v.temperatura_c or "—"} · FC {v.frecuencia_cardiaca or "—"} · FR {v.frecuencia_respiratoria or "—"} · PA {v.presion_sistolica or "—"}/{v.presion_diastolica or "—"} · SpO2 {v.saturacion_oxigeno or "—"}% · Peso {v.peso_kg or "—"} kg · Talla {v.talla_cm or "—"} cm · Glucosa {v.glucosa_mg_dl or "—"}'
                for v in item.signos_vitales
            ) or 'Signos vitales: Sin registros'
            diagnosis = '\n'.join(f'{d.tipo.nombre}: {d.descripcion} ({d.profesional.nombre_completo})' for d in item.diagnosticos) or 'Diagnósticos: Sin registros'
            consultation_rows.append([str(item.fecha_consulta), f'Profesional: {item.profesional.nombre_completo} · {item.profesional.especialidad}\nMotivo: {item.motivo or "—"}\nSíntomas: {item.sintomas or "—"}\nEvaluación: {item.evaluacion or "—"}\nIndicaciones: {item.indicaciones or "—"}\nObservaciones: {item.observaciones or "—"}\n{vitals}\n{diagnosis}'])
        section('Consultas, signos vitales y diagnósticos', consultation_rows)
        prescription_rows = []
        for item in document.recetas:
            details = '\n'.join(
                f'{d.medicamento.nombre} ({d.medicamento.nombre_generico or "—"}; {d.medicamento.presentacion or "—"}; {d.medicamento.concentracion or "—"}) — {d.dosis}, {d.frecuencia}, {d.duracion_dias} días, cantidad {d.cantidad_total} {d.unidad_medida.nombre}, vía {d.via_administracion.nombre}. {d.instrucciones or ""}'
                for d in item.detalles
            ) or 'Medicamentos: Sin registros'
            prescription_rows.append([item.titulo or 'Receta', f'Estado: {item.estado.nombre}\nProfesional: {item.profesional.nombre_completo}\nEmisión: {item.fecha_emision}\nVigencia: {item.vigencia_hasta or "—"}\n{item.observaciones or ""}\n{details}'])
        section('Recetas y medicamentos', prescription_rows)
        section('Indicadores relevantes', [[item.indicador_nombre, f'{item.valor} {item.unidad_medida.nombre}\nOrigen: {item.origen_registro.nombre}\nFecha: {item.fecha_medicion}\n{item.observaciones or ""}'] for item in document.indicadores])

        SimpleDocTemplate(output, pagesize=A4, rightMargin=15 * mm, leftMargin=15 * mm,
                          topMargin=15 * mm, bottomMargin=15 * mm,
                          title='Expediente clínico Lumora').build(story)
        return output.getvalue()
