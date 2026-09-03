"""A15/B15 -- generación del PDF del expediente médico.

Regla central del checklist: "PDF generado desde la misma fuente de
datos" -- este módulo NUNCA vuelve a consultar la base de datos ni
recalcula nada clínico. Solo toma el PatientClinicalDocument ya armado
por ClinicalIntegrationService.patient_document() (la misma fuente que
sirve el JSON) y lo dibuja. Así el documento y el PDF son, por
construcción, coherentes entre sí.
"""

from __future__ import annotations

from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from lumora_api.schemas.clinical import PatientClinicalDocument

_STYLES = getSampleStyleSheet()
_TITLE = ParagraphStyle(
    "LumoraTitle", parent=_STYLES["Title"], fontSize=18, spaceAfter=4
)
_META = ParagraphStyle(
    "LumoraMeta", parent=_STYLES["Normal"], fontSize=9, textColor=colors.grey
)
_SECTION = ParagraphStyle(
    "LumoraSection",
    parent=_STYLES["Heading2"],
    fontSize=13,
    spaceBefore=14,
    spaceAfter=6,
    textColor=colors.HexColor("#1F2933"),
)
_BODY = ParagraphStyle("LumoraBody", parent=_STYLES["Normal"], fontSize=10, leading=14)
_EMPTY = ParagraphStyle(
    "LumoraEmpty", parent=_STYLES["Normal"], fontSize=10, textColor=colors.grey
)


def _p(text: object, style: ParagraphStyle = _BODY) -> Paragraph:
    return Paragraph("" if text is None else str(text), style)


def _section(title: str) -> Paragraph:
    return Paragraph(title, _SECTION)


def _table(headers: list[str], rows: list[list[object]]) -> Table:
    data = [headers] + [[_p(cell) for cell in row] for row in rows]
    table = Table(data, repeatRows=1, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E7EEF5")),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#C7D2DB")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def render_clinical_document_pdf(document: PatientClinicalDocument) -> bytes:
    """Dibuja `document` en un PDF y devuelve los bytes ya generados."""

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=1.6 * cm,
        bottomMargin=1.6 * cm,
        title=f"Expediente médico -- paciente {document.paciente_id}",
    )

    story: list[object] = []
    story.append(_p("Expediente Médico", _TITLE))
    story.append(
        _p(
            f"{document.paciente.nombres} {document.paciente.apellidos} "
            f"(paciente #{document.paciente_id})",
            _BODY,
        )
    )
    meta_bits = [f"Generado el {document.generado_en.strftime('%d/%m/%Y %H:%M UTC')}"]
    if document.autor:
        meta_bits.append(f"por {document.autor}")
    if document.expediente:
        meta_bits.append(f"Expediente {document.expediente.numero_expediente}")
    story.append(_p(" · ".join(meta_bits), _META))
    story.append(Spacer(1, 10))

    story.append(_section("Alergias"))
    if document.alergias:
        story.append(
            _table(
                ["Nombre", "Observaciones"],
                [[item.nombre, item.observaciones or "-"] for item in document.alergias],
            )
        )
    else:
        story.append(_p("Sin alergias registradas.", _EMPTY))

    story.append(_section("Discapacidades"))
    if document.discapacidades:
        story.append(
            _table(
                ["Nombre", "Observaciones"],
                [
                    [item.nombre, item.observaciones or "-"]
                    for item in document.discapacidades
                ],
            )
        )
    else:
        story.append(_p("Sin discapacidades registradas.", _EMPTY))

    story.append(_section("Condiciones médicas"))
    if document.condiciones:
        story.append(
            _table(
                ["Nombre", "Inicio", "Fin", "Descripción"],
                [
                    [
                        item.nombre,
                        item.fecha_inicio or "-",
                        item.fecha_fin or "-",
                        item.descripcion or "-",
                    ]
                    for item in document.condiciones
                ],
            )
        )
    else:
        story.append(_p("Sin condiciones registradas.", _EMPTY))

    story.append(_section("Antecedentes"))
    if document.antecedentes:
        story.append(
            _table(
                ["Descripción", "Fecha"],
                [[item.descripcion, item.fecha or "-"] for item in document.antecedentes],
            )
        )
    else:
        story.append(_p("Sin antecedentes registrados.", _EMPTY))

    story.append(_section("Consultas"))
    if document.consultas:
        for entry in document.consultas:
            consulta = entry.consulta
            story.append(
                _p(
                    f"<b>{consulta.fecha_consulta.strftime('%d/%m/%Y')}</b> -- "
                    f"{consulta.motivo or 'Consulta médica'}",
                    _BODY,
                )
            )
            if consulta.evaluacion:
                story.append(_p(f"Evaluación: {consulta.evaluacion}", _BODY))
            if entry.diagnosticos:
                story.append(
                    _p(
                        "Diagnósticos: "
                        + "; ".join(item.descripcion for item in entry.diagnosticos),
                        _BODY,
                    )
                )
            if entry.signos_vitales:
                latest = entry.signos_vitales[-1]
                vitals_bits = [
                    f"{latest.presion_sistolica}/{latest.presion_diastolica} mmHg"
                    if latest.presion_sistolica and latest.presion_diastolica
                    else None,
                    f"{latest.frecuencia_cardiaca} lpm"
                    if latest.frecuencia_cardiaca
                    else None,
                    f"{latest.temperatura_c} °C" if latest.temperatura_c else None,
                    f"{latest.peso_kg} kg" if latest.peso_kg else None,
                ]
                vitals_text = ", ".join(bit for bit in vitals_bits if bit)
                if vitals_text:
                    story.append(_p(f"Signos vitales: {vitals_text}", _BODY))
            story.append(Spacer(1, 6))
    else:
        story.append(_p("Sin consultas registradas.", _EMPTY))

    story.append(_section("Recetas y medicación"))
    if document.recetas:
        story.append(
            _table(
                ["Emitida", "Vigente hasta", "Título"],
                [
                    [
                        item.fecha_emision.strftime("%d/%m/%Y"),
                        item.vigencia_hasta.strftime("%d/%m/%Y")
                        if item.vigencia_hasta
                        else "-",
                        item.titulo or "-",
                    ]
                    for item in document.recetas
                ],
            )
        )
    else:
        story.append(_p("Sin recetas registradas.", _EMPTY))

    story.append(_section("Indicadores"))
    if document.mediciones:
        story.append(
            _table(
                ["Fecha", "Indicador", "Valor"],
                [
                    [
                        item.fecha_medicion.strftime("%d/%m/%Y %H:%M"),
                        item.indicador_nombre,
                        f"{item.valor} {item.unidad_medida}",
                    ]
                    for item in document.mediciones
                ],
            )
        )
    else:
        story.append(_p("Sin mediciones registradas.", _EMPTY))

    doc.build(story)
    return buffer.getvalue()
