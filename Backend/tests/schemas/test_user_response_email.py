from lumora_api.schemas.identity import UserRead
from lumora_api.schemas.patient_context import CurrentUserRead


def test_response_dtos_accept_reserved_test_email_domains():
    assert UserRead.model_validate({"id": 1, "email": "user@example.test", "username": "u", "activo": True, "email_verificado": True, "persona": {"id": 1, "nombres": "A", "apellidos": "B", "fecha_nacimiento": None, "telefono": None, "sexo_id": None}, "roles": []})
    assert CurrentUserRead.model_validate({"id": 1, "email": "user@example.test", "username": "u", "activo": True, "email_verificado": True, "persona": {"id": 1, "nombres": "A", "apellidos": "B"}, "roles": []})
