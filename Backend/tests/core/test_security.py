from lumora_api.core.security import hash_password, verify_password


def test_password_is_hashed_with_argon2():
    hashed = hash_password("secret-password")

    assert hashed.startswith("$argon2")
    assert hashed != "secret-password"
    assert verify_password("secret-password", hashed)
