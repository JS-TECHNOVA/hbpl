from email.utils import formataddr
import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection
from django.template.loader import render_to_string

from .models import EmailServiceConfiguration

logger = logging.getLogger(__name__)


def get_active_email_service():
    return EmailServiceConfiguration.objects.filter(is_active=True).first()


def get_email_connection(configuration=None):
    configuration = configuration or get_active_email_service()
    if configuration is None:
        return get_connection()
    return get_connection(
        backend="django.core.mail.backends.smtp.EmailBackend",
        host=configuration.host,
        port=configuration.port,
        username=configuration.username,
        password=configuration.get_smtp_password(),
        use_tls=configuration.use_tls,
        use_ssl=configuration.use_ssl,
        timeout=configuration.timeout_seconds,
    )


def get_configured_from_email(configuration=None):
    configuration = configuration or get_active_email_service()
    address = configuration.from_email if configuration and configuration.from_email else settings.DEFAULT_FROM_EMAIL
    if configuration and configuration.from_name:
        return formataddr((configuration.from_name, address))
    return address


def send_configured_email(subject, body, recipients, *, html_body=None, attachments=(), fail_silently=False):
    try:
        configuration = get_active_email_service()
        if html_body is None:
            html_body = render_to_string("core/emails/message.html", {
                "subject": subject,
                "body": body,
                "portal_url": settings.EXAM_PORTAL_URL,
            })
        message = EmailMultiAlternatives(
            subject=subject,
            body=body,
            from_email=get_configured_from_email(configuration),
            to=list(recipients),
            connection=get_email_connection(configuration),
        )
        message.attach_alternative(html_body, "text/html")
        for filename, content, mimetype in attachments:
            message.attach(filename, content, mimetype)
        return message.send(fail_silently=fail_silently)
    except Exception:
        if not fail_silently:
            raise
        logger.exception("Failed to send email through the configured backend")
        return 0


def send_templated_email(subject, recipients, template_name, context, *, attachments=(), fail_silently=False):
    context = {"portal_url": settings.EXAM_PORTAL_URL, **context}
    html_body = render_to_string(f"{template_name}.html", context)
    text_body = render_to_string(f"{template_name}.txt", context)
    return send_configured_email(
        subject,
        text_body,
        recipients,
        html_body=html_body,
        attachments=attachments,
        fail_silently=fail_silently,
    )
