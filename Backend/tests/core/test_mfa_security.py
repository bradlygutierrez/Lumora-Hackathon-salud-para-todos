from lumora_api.core.security import decrypt_mfa_secret, encrypt_mfa_secret


def test_mfa_secret_is_encrypted_and_recoverable():
    secret = "JBSWY3DPEHPK3PXP"
    encrypted = encrypt_mfa_secret(secret)

    assert encrypted != secret
    assert decrypt_mfa_secret(encrypted) == secret
