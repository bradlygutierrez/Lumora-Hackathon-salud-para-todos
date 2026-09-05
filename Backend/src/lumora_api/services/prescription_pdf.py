"""B15 -- generación del PDF de una receta médica individual.

Misma regla que clinical_document_pdf.py: el PDF se arma a partir del
ORM ya cargado por PrescriptionService.get_receta() (misma fuente que
sirve el JSON de la receta), sin volver a consultar ni recalcular nada
clínico.
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

from lumora_api.models.prescriptions import Receta

_STYLES = getSampleStyleSheet()
_TITLE = ParagraphStyle(
    "LumoraRxTitle", parent=_STYLES["Title"], fontSize=18, spaceAfter=4
)
_META = ParagraphStyle(
    "LumoraRxMeta", parent=_STYLES["Normal"], fontSize=9, textColor=colors.grey
)
_SECTION = ParagraphStyle(
    "LumoraRxSection",
    parent=_STYLES["Heading2"],
    fontSize=13,
    spaceBefore=14,
    spaceAfter=6,
    textColor=colors.HexColor("#1F2933"),
)
_BODY = ParagraphStyle("LumoraRxBody", parent=_STYLES["Normal"], fontSize=10, leading=14)
_EMPTY = ParagraphStyle(
    "LumoraRxEmpty", parent=_STYLES["Normal"], fontSize=10, textColor=colors.grey
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


def render_prescription_pdf(receta: Receta) -> bytes:
    """Dibuja `receta` (con paciente, profesional y detalles ya cargados
    por PrescriptionRepository.get_receta_by_id) en un PDF."""

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=1.6 * cm,
        bottomMargin=1.6 * cm,
        title=f"Receta médica -- {receta.id}",
    )

    story: list[object] = []
    story.append(_p("Receta Médica", _TITLE))
    story.append(
        _p(
            f"{receta.paciente.persona.nombres} {receta.paciente.persona.apellidos} "
            f"(paciente #{receta.paciente_id})",
            _BODY,
        )
    )
    meta_bits = [
        f"Emitida el {receta.fecha_emision.strftime('%d/%m/%Y %H:%M UTC')}",
        f"Dr(a). {receta.profesional.persona.nombres} {receta.profesional.persona.apellidos} "
        f"-- {receta.profesional.especialidad}",
    ]
    if receta.vigencia_hasta:
        meta_bits.append(f"Vigente hasta {receta.vigencia_hasta.strftime('%d/%m/%Y')}")
    story.append(_p(" · ".join(meta_bits), _META))
    if receta.titulo:
        story.append(Spacer(1, 8))
        story.append(_p(f"<b>{receta.titulo}</b>", _BODY))
    story.append(Spacer(1, 10))

    story.append(_section("Medicamentos"))
    if receta.detalles:
        story.append(
            _table(
                ["Medicamento", "Dosis", "Frecuencia", "Duración", "Cantidad", "Vía"],
                [
                    [
                        detalle.medicamento.nombre,
                        detalle.dosis,
                        detalle.frecuencia,
                        f"{detalle.duracion_dias} días",
                        f"{detalle.cantidad_total} {detalle.unidad_medida.nombre}",
                        detalle.via_administracion.nombre,
                    ]
                    for detalle in receta.detalles
                ],
            )
        )
        for detalle in receta.detalles:
            if detalle.instrucciones:
                story.append(Spacer(1, 4))
                story.append(
                    _p(f"<b>{detalle.medicamento.nombre}:</b> {detalle.instrucciones}", _BODY)
                )
    else:
        story.append(_p("Esta receta no tiene medicamentos registrados.", _EMPTY))

    if receta.observaciones:
        story.append(_section("Observaciones"))
        story.append(_p(receta.observaciones, _BODY))

    doc.build(story)
    return buffer.getvalue()
