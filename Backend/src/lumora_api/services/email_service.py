from email.message import EmailMessage
import smtplib
from typing import Callable
from urllib.parse import urlencode
from lumora_api.core.config import Settings, get_settings

class EmailService:
    def __init__(self, settings: Settings | None = None, smtp_factory: Callable[..., smtplib.SMTP] = smtplib.SMTP) -> None:
        self.settings = settings or get_settings()
        self.smtp_factory = smtp_factory

    def send_verification_code(self, recipient: str, code: str) -> None:
        self._send(recipient, "Código de verificación de Lumora", f"Tu código de verificación es: {code}\n")

    def send_mfa_code(self, recipient: str, code: str) -> None:
        self._send(recipient, "Código de autenticación de Lumora", f"Tu código de autenticación es: {code}\n")

    def send_password_reset(self, recipient: str, token: str) -> None:
        link = f"{self.settings.password_reset_web_url}?{urlencode(dict(token=token))}"
        plain = ("Solicitaste restablecer tu contraseña de Lumora.\n\n"
                 "Abre este enlace desde el dispositivo donde tienes Lumora instalado:\n\n"
                 f"<{link}>\n\nEste enlace expira en 30 minutos.\n\n"
                 "Si no solicitaste este cambio, puedes ignorar este correo.\n")
        html = ("<html><body><h1>Restablecer contraseña</h1><p>Solicitaste restablecer tu contraseña de Lumora.</p>"
                f"<p><a href=\"{link}\">Restablecer contraseña</a></p><p><a href=\"{link}\">{link}</a></p>"
                "<p>Este enlace expira en 30 minutos.</p><p>Si no solicitaste este cambio, puedes ignorar este correo.</p></body></html>")
        self._send(recipient, "Recuperación de contraseña de Lumora", plain, html)

    def _send(self, recipient: str, subject: str, body: str, html: str | None = None) -> None:
        username = self.settings.smtp_username
        password = self.settings.smtp_app_password.get_secret_value()
        sender = self.settings.email_from or username
        if not username or not password or not sender:
            raise RuntimeError("El servicio de correo no está configurado")
        message = EmailMessage()
        message["From"] = sender; message["To"] = recipient; message["Subject"] = subject
        message.set_content(body)
        if html is not None: message.add_alternative(html, subtype="html")
        with self.smtp_factory(self.settings.smtp_host, self.settings.smtp_port, timeout=10) as smtp:
            smtp.starttls(); smtp.login(username, password); smtp.send_message(message)
