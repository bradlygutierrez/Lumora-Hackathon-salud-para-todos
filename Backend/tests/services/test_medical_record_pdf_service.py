from datetime import date, datetime, timezone

import pytest

from lumora_api.schemas.medical_record_document import (
    MedicalRecordDocumentRead, PatientDocumentRead,
)
from lumora_api.services.medical_record_pdf_service import MedicalRecordPdfService, safe_text


def document() -> MedicalRecordDocumentRead:
    return MedicalRecordDocumentRead(
        generated_at=datetime.now(timezone.utc),
        paciente=PatientDocumentRead(
            id=7, nombres='Ana áéíóúñ¿¡°', apellidos='<Paciente & segura>',
            fecha_nacimiento=date(1990, 1, 2), sexo=None, tipo_sangre=None,
        ),
        expediente=None, antecedentes=[], alergias=[], discapacidades=[],
        condiciones=[], consultas=[], recetas=[], indicadores=[],
    )


def test_renderer_accepts_only_canonical_dto_and_returns_pdf() -> None:
    pdf = MedicalRecordPdfService().render(document())
    assert pdf.startswith(b'%PDF-')
    assert len(pdf) > 500
    with pytest.raises(AttributeError):
        MedicalRecordPdfService().render({'paciente': {}})  # type: ignore[arg-type]


def test_safe_text_escapes_markup_before_preserving_newlines() -> None:
    assert safe_text(None) == ''
    assert safe_text('<b>A&B</b>\nSiguiente') == '&lt;b&gt;A&amp;B&lt;/b&gt;<br/>Siguiente'


def test_long_mult_page_document_is_valid() -> None:
    item = document()
    item.paciente.nombres = ('Texto largo áéíóúñ¿¡° ' * 250)
    assert MedicalRecordPdfService().render(item).startswith(b'%PDF-')
