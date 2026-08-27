from email.message import EmailMessage
import smtplib
from typing import Callable

from lumora_api.core.config import Settings, get_settings


class EmailService:
    def __init__(
        self,
        settings: Settings | None = None,
        smtp_factory: Callable[..., smtplib.SMTP] = smtplib.SMTP,
    ) -> None:
        self.settings = settings or get_settings()
        self.smtp_factory = smtp_factory

    def send_verification_code(self, recipient: str, code: str) -> None:
        self._send(
            recipient,
            "Código de verificación de Lumora",
            f"Tu código de verificación es: {code}\n",
        )

    def send_password_reset(self, recipient: str, token: str) -> None:
        self._send(
            recipient,
            "Recuperación de contraseña de Lumora",
            f"Tu token de recuperación es: {token}\n",
        )

    def _send(self, recipient: str, subject: str, body: str) -> None:
        username = self.settings.smtp_username
        password = self.settings.smtp_app_password.get_secret_value()
        sender = self.settings.email_from or username
        if not username or not password or not sender:
            raise RuntimeError("El servicio de correo no está configurado")

        message = EmailMessage()
        message["From"] = sender
        message["To"] = recipient
        message["Subject"] = subject
        message.set_content(body)

        with self.smtp_factory(
            self.settings.smtp_host,
            self.settings.smtp_port,
            timeout=10,
        ) as smtp:
            smtp.starttls()
            smtp.login(username, password)
            smtp.send_message(message)
