import pytest
from pydantic import ValidationError

from lumora_api.schemas.affiliations import AffiliationCreate


def _data(**overrides):
    data = {
        "tipo": "institucion",
        "nombre": "Clínica Lumora",
        "correo_contacto": "admin@lumora.example",
        "cupos_comprados": 2,
    }
    data.update(overrides)
    return data


def test_independent_affiliation_requires_one_seat():
    with pytest.raises(ValidationError):
        AffiliationCreate(**_data(tipo="independiente", cupos_comprados=2))


def test_institution_requires_a_positive_seat_count():
    with pytest.raises(ValidationError):
        AffiliationCreate(**_data(cupos_comprados=0))


def test_valid_affiliation_types_are_accepted():
    assert AffiliationCreate(**_data(tipo="independiente", cupos_comprados=1)).tipo == "independiente"
    assert AffiliationCreate(**_data()).cupos_comprados == 2
