"""B08 authentication schema contracts."""

from datetime import date

import pytest
from pydantic import ValidationError

from lumora_api.schemas.auth import (
    LoginMfaResponse,
    LoginTokenResponse,
    PatientRegistrationRequest,
    VerifyEmailCodeRequest,
)


def registration_payload(**overrides):
    payload = {
        "username": "bradly",
        "email": "user@example.com",
        "password": "Secure123!",
        "phone": "+50588888888",
        "first_names": "Bradly Antonio",
        "last_names": "Gutierrez Cordoba",
        "birth_date": date(2000, 1, 1),
        "sex_id": 1,
        "blood_type_id": 2,
        "address": {"line_1": "Casa 1", "city": "Managua", "department": "Managua", "country": "Nicaragua"},
        "emergency_contact": {"name": "Maria", "relationship": "Madre", "phone": "+50587777777"},
        "accept_terms": True,
        "accept_privacy": True,
    }
    payload.update(overrides)
    return payload


def test_registration_requires_both_consents():
    with pytest.raises(ValidationError):
        PatientRegistrationRequest.model_validate(registration_payload(accept_terms=False))
    with pytest.raises(ValidationError):
        PatientRegistrationRequest.model_validate(registration_payload(accept_privacy=False))


def test_registration_normalizes_email_and_username():
    data = PatientRegistrationRequest.model_validate(registration_payload(username=" Bradly ", email="USER@EXAMPLE.COM"))
    assert data.username == "bradly"
    assert str(data.email) == "user@example.com"


def test_verification_code_is_exactly_six_digits():
    assert VerifyEmailCodeRequest(email="user@example.com", code="123456").code == "123456"
    with pytest.raises(ValidationError):
        VerifyEmailCodeRequest(email="user@example.com", code="12345")


def test_login_responses_have_predictable_discriminator():
    tokens = LoginTokenResponse(access_token="access", refresh_token="refresh")
    challenge = LoginMfaResponse(challenge_token="challenge", expires_in=300)
    assert tokens.mfa_required is False
    assert challenge.mfa_required is True
