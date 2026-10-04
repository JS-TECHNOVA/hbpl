from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from core.emailing import get_active_email_service, get_email_connection


class Command(BaseCommand):
    help = "Check SMTP configuration and Celery broker connectivity without sending email."

    def handle(self, *args, **options):
        email_service = get_active_email_service()
        if email_service:
            email_connection = get_email_connection(email_service)
            label = f"active email configuration ({email_service.host}:{email_service.port})"
        elif settings.EMAIL_BACKEND == "django.core.mail.backends.smtp.EmailBackend":
            email_connection = get_email_connection()
            label = f"environment SMTP ({settings.EMAIL_HOST}:{settings.EMAIL_PORT})"
        else:
            raise CommandError("No production SMTP configuration is active (email model or SMTP environment settings).")

        try:
            email_connection.open()
            self.stdout.write(self.style.SUCCESS(f"SMTP connection OK: {label}"))
        except Exception as exc:
            raise CommandError(f"SMTP connection failed: {exc}") from exc
        finally:
            try:
                email_connection.close()
            except Exception:
                pass

        try:
            from hbpl_project.celery import app

            with app.connection_for_read() as broker_connection:
                broker_connection.ensure_connection(max_retries=0)
            self.stdout.write(self.style.SUCCESS("Celery broker connection OK."))
        except Exception as exc:
            raise CommandError(f"Celery broker connection failed: {exc}") from exc

        if not settings.EXAM_PORTAL_URL.startswith("https://"):
            self.stderr.write(self.style.WARNING("EXAM_PORTAL_URL is not HTTPS; production emails may expose account links."))
