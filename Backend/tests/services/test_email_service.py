from lumora_api.core.config import Settings
from lumora_api.services.email_service import EmailService


class FakeSmtp:
    def __init__(self, host, port, timeout):
        self.started_tls = False
        self.credentials = None
        self.message = None

    def __enter__(self): return self
    def __exit__(self, *_): return None
    def starttls(self): self.started_tls = True
    def login(self, username, password): self.credentials = (username, password)
    def send_message(self, message): self.message = message


def test_verification_email_uses_tls_and_contains_code_only_for_recipient():
    instances = []
    def factory(*args, **kwargs):
        instances.append(FakeSmtp(*args, **kwargs))
        return instances[-1]
    settings = Settings(database_url="sqlite+aiosqlite://", smtp_username="sender@gmail.com", smtp_app_password="app-password", email_from="sender@gmail.com")
    EmailService(settings, factory).send_verification_code("patient@example.com", "123456")
    smtp = instances[0]
    assert smtp.started_tls is True
    assert smtp.credentials == ("sender@gmail.com", "app-password")
    assert smtp.message["To"] == "patient@example.com"
    assert "123456" in smtp.message.get_content()
    assert "app-password" not in smtp.message.as_string()


def test_password_reset_email_contains_encoded_deep_link_and_html_button():
    instances = []
    def factory(*args, **kwargs):
        instances.append(FakeSmtp(*args, **kwargs))
        return instances[-1]
    settings = Settings(database_url="sqlite+aiosqlite://", smtp_username="sender@gmail.com", smtp_app_password="app-password", email_from="sender@gmail.com")
    EmailService(settings, factory).send_password_reset("user@example.com", "abc+/=?123")
    message = instances[0].message
    encoded = "lumora://reset-password?token=abc%2B%2F%3D%3F123"
    parts = [part.get_content() for part in message.walk() if part.get_content_type() in {"text/plain", "text/html"}]
    assert any(encoded in part for part in parts)
    assert any("Restablecer contrase" in part for part in parts)
    assert any("href=\"" + encoded + "\"" in part for part in parts)
