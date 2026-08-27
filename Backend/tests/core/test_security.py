import pytest

from lumora_api.core.security import hash_password, validate_password_policy, verify_password


def test_password_is_hashed_with_argon2():
    hashed = hash_password("secret-password")

    assert hashed.startswith("$argon2")
    assert hashed != "secret-password"
    assert verify_password("secret-password", hashed)


@pytest.mark.parametrize("password", ["short1!", "alllowercase1!", "ALLUPPERCASE1!", "NoNumber!", "NoSymbol123"])
def test_password_policy_rejects_weak_passwords(password):
    with pytest.raises(ValueError, match="contraseña"):
        validate_password_policy(password)


def test_password_policy_accepts_strong_password():
    assert validate_password_policy("Secure123!") == "Secure123!"
