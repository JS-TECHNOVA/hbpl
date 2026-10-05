import logging
from datetime import date
from types import SimpleNamespace

from celery import shared_task
from django.conf import settings
from django.core.files.base import ContentFile
from django.utils import timezone

from core.emailing import send_configured_email, send_templated_email

logger = logging.getLogger(__name__)


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={"max_retries": 5})
def send_exam_application_confirmation_email(self, application_id):
    from .models import ExamApplication

    application = ExamApplication.objects.select_related("exam", "exam__session").get(pk=application_id)
    if application.status not in [ExamApplication.Status.SUBMITTED, ExamApplication.Status.RESUBMITTED]:
        return "not-submitted"
    if application.application_confirmation_email_sent_at and application.submitted_at and application.application_confirmation_email_sent_at >= application.submitted_at:
        return "already-sent"
    if not application.email:
        application.application_confirmation_email_last_error = "The application has no email address."
        application.save(update_fields=["application_confirmation_email_last_error", "updated_at"])
        return "missing-email"

    try:
        sent = send_templated_email(
            subject=f"Application received: {application.exam.name}",
            recipients=[application.email],
            template_name="core/emails/exam_application_submitted",
            context={
                "student_name": application.full_name,
                "exam_name": application.exam.name,
                "session_name": application.exam.session.name if application.exam.session_id else "",
                "application_number": application.application_number or f"Draft-{application.pk}",
                "submitted_at": timezone.localtime(application.submitted_at).strftime("%d %B %Y, %I:%M %p") if application.submitted_at else "Recently",
                "exam_date": application.exam.exam_date.strftime("%d %B %Y") if application.exam.exam_date else "",
                "dashboard_url": f"{settings.EXAM_PORTAL_URL}/exams/dashboard",
            },
        )
        if not sent:
            raise RuntimeError("The email backend did not accept the enrollment confirmation.")
    except Exception as exc:
        application.application_confirmation_email_last_error = str(exc)[:4000]
        application.save(update_fields=["application_confirmation_email_last_error", "updated_at"])
        logger.exception("Enrollment confirmation email failed for application id=%s", application_id)
        raise

    application.application_confirmation_email_sent_at = timezone.now()
    application.application_confirmation_email_last_error = ""
    application.save(update_fields=["application_confirmation_email_sent_at", "application_confirmation_email_last_error", "updated_at"])
    return "sent"


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={"max_retries": 5})
def send_exam_payment_confirmation_email(self, payment_id):
    from .models import CashfreeExamPayment

    payment = CashfreeExamPayment.objects.select_related(
        "application__exam__session", "manually_accepted_by",
    ).get(pk=payment_id)
    if payment.status != CashfreeExamPayment.Status.PAID:
        return "not-paid"
    if payment.payment_confirmation_email_sent_at:
        return "already-sent"
    application = payment.application
    if not application.email:
        payment.payment_confirmation_email_last_error = "The application has no email address."
        payment.save(update_fields=["payment_confirmation_email_last_error", "updated_at"])
        return "missing-email"

    try:
        sent = send_templated_email(
            subject=f"Payment received: {application.exam.name}",
            recipients=[application.email],
            template_name="core/emails/exam_payment_received",
            context={
                "student_name": application.full_name,
                "exam_name": application.exam.name,
                "session_name": application.exam.session.name if application.exam.session_id else "",
                "application_number": application.application_number or f"Draft-{application.pk}",
                "amount": f"{payment.currency} {payment.amount:.2f}",
                "order_id": payment.order_id,
                "payment_reference": payment.manual_reference if payment.payment_method == CashfreeExamPayment.Method.MANUAL else payment.cf_payment_id or payment.order_id,
                "payment_method": payment.get_payment_method_display(),
                "manually_accepted_by": payment.manually_accepted_by.username if payment.manually_accepted_by_id else "",
                "paid_at": timezone.localtime(payment.paid_at or timezone.now()).strftime("%d %B %Y, %I:%M %p"),
                "dashboard_url": f"{settings.EXAM_PORTAL_URL}/exams/dashboard",
            },
        )
        if not sent:
            raise RuntimeError("The email backend did not accept the payment confirmation.")
    except Exception as exc:
        payment.payment_confirmation_email_last_error = str(exc)[:4000]
        payment.save(update_fields=["payment_confirmation_email_last_error", "updated_at"])
        logger.exception("Payment confirmation email failed for payment id=%s", payment_id)
        raise

    payment.payment_confirmation_email_sent_at = timezone.now()
    payment.payment_confirmation_email_last_error = ""
    payment.save(update_fields=["payment_confirmation_email_sent_at", "payment_confirmation_email_last_error", "updated_at"])
    return "sent"


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={"max_retries": 5})
def send_exam_application_status_email(self, event_id):
    from .models import ApplicationEvent, ExamApplication

    event = ApplicationEvent.objects.select_related(
        "application__exam__session", "application__centre",
    ).get(pk=event_id)
    if event.notification_email_sent_at:
        return "already-sent"
    if event.to_status not in {
        ExamApplication.Status.CORRECTION_REQUIRED,
        ExamApplication.Status.APPROVED,
        ExamApplication.Status.REJECTED,
    }:
        return "not-notifiable"
    application = event.application
    if not application.email:
        event.notification_email_last_error = "The application has no email address."
        event.save(update_fields=["notification_email_last_error"])
        return "missing-email"

    labels = {
        ExamApplication.Status.CORRECTION_REQUIRED: "Action required: correct your application",
        ExamApplication.Status.APPROVED: "Your application has been approved",
        ExamApplication.Status.REJECTED: "Your application was not approved",
    }
    try:
        sent = send_templated_email(
            subject=f"{labels[event.to_status]} — {application.exam.name}",
            recipients=[application.email],
            template_name="core/emails/exam_application_status",
            context={
                "student_name": application.full_name,
                "exam_name": application.exam.name,
                "session_name": application.exam.session.name if application.exam.session_id else "",
                "application_number": application.application_number or f"APP-{application.pk}",
                "status": event.to_status,
                "status_label": application.get_status_display(),
                "review_note": event.note,
                "centre_name": application.centre.name if application.centre_id else "",
                "dashboard_url": f"{settings.EXAM_PORTAL_URL}/exams/dashboard",
            },
        )
        if not sent:
            raise RuntimeError("The email backend did not accept the application status notification.")
    except Exception as exc:
        event.notification_email_last_error = str(exc)[:4000]
        event.save(update_fields=["notification_email_last_error"])
        logger.exception("Application status email failed for event id=%s", event_id)
        raise

    event.notification_email_sent_at = timezone.now()
    event.notification_email_last_error = ""
    event.save(update_fields=["notification_email_sent_at", "notification_email_last_error"])
    return "sent"


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={"max_retries": 5})
def send_student_password_reset_email(self, user_id, uid, token):
    from django.contrib.auth.models import User

    user = User.objects.get(pk=user_id, is_active=True)
    if not user.email:
        return "missing-email"
    reset_url = f"{settings.EXAM_PORTAL_URL}/exams/password-reset/confirm?uid={uid}&token={token}"
    sent = send_templated_email(
        subject="Reset your HBPL student account password",
        recipients=[user.email],
        template_name="core/emails/student_password_reset",
        context={"student_name": user.get_full_name() or user.username, "reset_url": reset_url},
    )
    if not sent:
        raise RuntimeError("The email backend did not accept the password-reset email.")
    return "sent"


def _build_admit_card_pdf(registration, exam=None):
    from api.admit_card import generate_admit_card

    template_path = exam.admit_card_template.path if exam and exam.admit_card_template else None
    return generate_admit_card(registration, template_path=template_path, exam=exam)


def _email_admit_card(*, recipient, full_name, roll_number, pdf_bytes):
    return send_configured_email(
        subject="Your HBPL examination admit card is ready",
        body=(
            f"Dear {full_name},\n\n"
            "Your admit card has been published. A PDF copy is attached to this email.\n\n"
            f"Application/Roll number: {roll_number}\n\n"
            "Please print the admit card and bring it with you on examination day.\n\n"
            "Regards,\nHBPL Examination Team"
        ),
        recipients=[recipient],
        attachments=[(f"admit-card-{roll_number}.pdf", pdf_bytes, "application/pdf")],
    )


def _email_certificate(*, recipient, full_name, certificate_number, pdf_bytes):
    return send_configured_email(
        subject="Your HBPL examination certificate is ready",
        body=(f"Dear {full_name},\n\nYour examination certificate has been issued. "
              f"Certificate number: {certificate_number}\nA PDF copy is attached.\n\nRegards,\nHBPL Examination Team"),
        recipients=[recipient],
        attachments=[(f"certificate-{certificate_number}.pdf", pdf_bytes, "application/pdf")],
    )


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={"max_retries": 5})
def send_exam_application_admit_card_email(self, application_id):
    from .models import Exam, ExamApplication

    application = ExamApplication.objects.select_related("exam", "student__user").get(pk=application_id)
    if application.status != ExamApplication.Status.APPROVED or not application.admit_card_published:
        return "not-published-or-approved"
    if application.admit_card_email_sent_at:
        return "already-sent"
    if not application.email:
        application.admit_card_email_last_error = "The application has no email address."
        application.save(update_fields=["admit_card_email_last_error", "updated_at"])
        return "missing-email"
    if application.exam.centres.exists() and not application.centre_id:
        application.admit_card_email_last_error = "Assign an examination centre before issuing this admit card."
        application.save(update_fields=["admit_card_email_last_error", "updated_at"])
        return "centre-not-assigned"

    try:
        centre = application.centre
        documents = {
            item.document_type: item.file
            for item in application.documents.filter(document_type__in=["photo", "signature"])
        }
        profile = application.student
        # Admit cards are deliberately transient: render the active template to
        # bytes for the email attachment, never into application media storage.
        pdf = _build_admit_card_pdf(SimpleNamespace(
            full_name=application.full_name,
            date_of_birth=application.date_of_birth or date.today(),
            roll_number=application.application_number or f"APP-{application.pk}",
            class_name=application.class_name,
            school_name=application.school_name,
            examination_center=centre.name if centre else "",
            center_address=centre.address if centre else "",
            student_photo=documents.get("photo") or profile.photo,
            student_signature=documents.get("signature") or profile.signature,
        ), application.exam)
        _email_admit_card(
            recipient=application.email,
            full_name=application.full_name,
            roll_number=application.application_number or f"APP-{application.pk}",
            pdf_bytes=pdf,
        )
    except Exception as exc:
        application.admit_card_email_last_error = str(exc)[:4000]
        application.save(update_fields=["admit_card_email_last_error", "updated_at"])
        logger.exception("Admit-card email failed for application id=%s", application_id)
        raise

    application.admit_card_email_sent_at = timezone.now()
    application.admit_card_email_last_error = ""
    application.save(update_fields=["admit_card_email_sent_at", "admit_card_email_last_error", "updated_at"])
    return "sent"


@shared_task
def queue_exam_admit_card_emails(exam_id):
    from .models import Exam, ExamApplication

    exam = Exam.objects.get(pk=exam_id)
    application_ids = ExamApplication.objects.filter(
        exam=exam,
        status=ExamApplication.Status.APPROVED,
        admit_card_published=True,
        admit_card_email_sent_at__isnull=True,
    ).exclude(email="").values_list("id", flat=True)
    queued = 0
    for application_id in application_ids.iterator(chunk_size=500):
        send_exam_application_admit_card_email.delay(application_id)
        queued += 1
    return queued


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={"max_retries": 5})
def issue_exam_application_certificate(self, application_id):
    from .models import Exam, ExamApplication, ExamResult

    application = ExamApplication.objects.select_related("exam").get(pk=application_id)
    result = ExamResult.objects.filter(application=application).first()
    if application.status != ExamApplication.Status.APPROVED or not application.results_published or not result:
        return "not-ready"
    if application.certificate_email_sent_at:
        return "already-sent"
    if not application.email:
        application.certificate_email_last_error = "The application has no email address."
        application.save(update_fields=["certificate_email_last_error", "updated_at"])
        return "missing-email"

    try:
        from api.certificate import generate_participation_certificate

        certificate_number = application.certificate_number or f"{(application.exam.code or 'HBPL').upper()}-CERT-{application.application_number or application.pk}"
        issued_at = application.certificate_issued_at or timezone.now()
        # Certificates are rendered into the email attachment only; no PDF is
        # written to media storage.
        pdf = generate_participation_certificate(SimpleNamespace(
            full_name=application.full_name,
            class_name=application.class_name or "",
            school_name=application.school_name,
            student_photo=application.student.photo,
            rank=result.rank,
            certificate_issued_at=issued_at,
        ), template_path=application.exam.certificate_template.path if application.exam.certificate_template else None,
            exam=application.exam, result=result, certificate_number=certificate_number)
        if not application.certificate_number:
            application.certificate_number = certificate_number
            application.certificate_issued_at = issued_at
            application.save(update_fields=["certificate_number", "certificate_issued_at", "updated_at"])
        _email_certificate(
            recipient=application.email,
            full_name=application.full_name,
            certificate_number=application.certificate_number or f"CERT-{application.pk}",
            pdf_bytes=pdf,
        )
    except Exception as exc:
        application.certificate_email_last_error = str(exc)[:4000]
        application.save(update_fields=["certificate_email_last_error", "updated_at"])
        logger.exception("Certificate email failed for application id=%s", application_id)
        raise

    application.certificate_email_sent_at = timezone.now()
    application.certificate_email_last_error = ""
    application.save(update_fields=["certificate_email_sent_at", "certificate_email_last_error", "updated_at"])
    return "sent"


@shared_task
def queue_exam_certificate_emails(exam_id):
    from .models import Exam, ExamApplication, ExamResult

    exam = Exam.objects.get(pk=exam_id)
    application_ids = ExamApplication.objects.filter(
        exam=exam,
        status=ExamApplication.Status.APPROVED,
        result__isnull=False,
        results_published=True,
        certificate_email_sent_at__isnull=True,
    ).exclude(email="").values_list("id", flat=True)
    queued = 0
    for application_id in application_ids.iterator(chunk_size=500):
        issue_exam_application_certificate.delay(application_id)
        queued += 1
    return queued


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={"max_retries": 5})
def send_legacy_admit_card_email(self, registration_id):
    from api.models import ExamRegistration

    registration = ExamRegistration.objects.get(pk=registration_id)
    if not registration.publish_admit_card:
        return "not-published"
    if registration.admit_card_email_sent_at:
        return "already-sent"
    if not registration.email:
        registration.admit_card_email_last_error = "The student record has no email address."
        registration.save(update_fields=["admit_card_email_last_error", "updated_at"])
        return "missing-email"

    try:
        pdf = registration.admit_card_file.read() if registration.admit_card_file else _build_admit_card_pdf(registration)
        _email_admit_card(
            recipient=registration.email,
            full_name=registration.full_name,
            roll_number=registration.roll_number,
            pdf_bytes=pdf,
        )
    except Exception as exc:
        registration.admit_card_email_last_error = str(exc)[:4000]
        registration.save(update_fields=["admit_card_email_last_error", "updated_at"])
        logger.exception("Admit-card email failed for registration id=%s", registration_id)
        raise

    registration.admit_card_email_sent_at = timezone.now()
    registration.admit_card_email_last_error = ""
    registration.save(update_fields=["admit_card_email_sent_at", "admit_card_email_last_error", "updated_at"])
    return "sent"
