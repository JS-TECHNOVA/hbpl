import logging

from django.db import transaction
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import Exam, ExamApplication, ExamResult

logger = logging.getLogger(__name__)


@receiver(pre_save, sender=Exam)
def snapshot_exam_status(sender, instance, **kwargs):
    if instance.pk:
        instance._previous_status = sender.objects.filter(pk=instance.pk).values_list("status", flat=True).first()
    else:
        instance._previous_status = None


@receiver(pre_save, sender=ExamApplication)
def snapshot_application_status(sender, instance, **kwargs):
    if instance.pk:
        previous = sender.objects.filter(pk=instance.pk).values("status", "centre_id").first()
        instance._previous_application_status = previous["status"] if previous else None
        instance._previous_centre_id = previous["centre_id"] if previous else None
    else:
        instance._previous_application_status = None
        instance._previous_centre_id = None


def _queue_exam_admit_card_emails(exam_id):
    try:
        from .tasks import queue_exam_admit_card_emails

        queue_exam_admit_card_emails.delay(exam_id)
    except Exception:
        logger.exception("Could not queue admit-card emails for exam id=%s", exam_id)


def _queue_exam_certificate_emails(exam_id):
    try:
        from .tasks import queue_exam_certificate_emails

        queue_exam_certificate_emails.delay(exam_id)
    except Exception:
        logger.exception("Could not queue certificate emails for exam id=%s", exam_id)


def _queue_one_application_email(application_id):
    try:
        from .tasks import send_exam_application_admit_card_email

        send_exam_application_admit_card_email.delay(application_id)
    except Exception:
        logger.exception("Could not queue admit-card email for application id=%s", application_id)
        ExamApplication.objects.filter(pk=application_id).update(
            admit_card_email_last_error="Email could not be queued. Check the Celery broker/worker and republish the card."
        )


def _queue_application_confirmation_email(application_id):
    try:
        from .tasks import send_exam_application_confirmation_email

        send_exam_application_confirmation_email.delay(application_id)
    except Exception:
        logger.exception("Could not queue enrollment confirmation email for application id=%s", application_id)
        ExamApplication.objects.filter(pk=application_id).update(
            application_confirmation_email_last_error="Email could not be queued. Check the Celery broker/worker."
        )


@receiver(post_save, sender=Exam)
def queue_admit_card_emails_when_exam_published(sender, instance, created, **kwargs):
    if created:
        return
    previous_status = getattr(instance, "_previous_status", None)
    if instance.status == Exam.Status.ADMIT_CARD_OUT and previous_status != Exam.Status.ADMIT_CARD_OUT:
        transaction.on_commit(lambda exam_id=instance.pk: _queue_exam_admit_card_emails(exam_id))
    if instance.status == Exam.Status.RESULT_OUT and previous_status != Exam.Status.RESULT_OUT:
        transaction.on_commit(lambda exam_id=instance.pk: _queue_exam_certificate_emails(exam_id))


@receiver(post_save, sender=ExamApplication)
def queue_admit_card_email_when_application_is_approved(sender, instance, created, **kwargs):
    if instance.status != ExamApplication.Status.APPROVED or not instance.exam_id:
        return
    if instance.exam.status != Exam.Status.ADMIT_CARD_OUT:
        return
    was_approved = getattr(instance, "_previous_application_status", None) == ExamApplication.Status.APPROVED
    centre_changed = getattr(instance, "_previous_centre_id", None) != instance.centre_id
    if not created and was_approved and not centre_changed:
        return
    if instance.exam.centres.exists() and not instance.centre_id:
        return
    transaction.on_commit(lambda application_id=instance.pk: _queue_one_application_email(application_id))


@receiver(post_save, sender=ExamApplication)
def queue_application_confirmation_when_submitted(sender, instance, created, **kwargs):
    if instance.status not in [ExamApplication.Status.SUBMITTED, ExamApplication.Status.RESUBMITTED]:
        return
    previous_status = getattr(instance, "_previous_application_status", None)
    if not created and previous_status == instance.status:
        return
    transaction.on_commit(lambda application_id=instance.pk: _queue_application_confirmation_email(application_id))


@receiver(post_save, sender=ExamResult)
def queue_certificate_email_when_result_saved(sender, instance, **kwargs):
    if not instance.application_id or instance.exam.status != Exam.Status.RESULT_OUT:
        return

    def queue_one():
        try:
            from .tasks import issue_exam_application_certificate

            issue_exam_application_certificate.delay(instance.application_id)
        except Exception:
            logger.exception("Could not queue certificate email for application id=%s", instance.application_id)

    transaction.on_commit(queue_one)
