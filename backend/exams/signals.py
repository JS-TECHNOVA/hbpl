import logging

from django.db import transaction
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import ExamApplication

logger = logging.getLogger(__name__)


@receiver(pre_save, sender=ExamApplication)
def snapshot_application_status(sender, instance, **kwargs):
    if instance.pk:
        previous = sender.objects.filter(pk=instance.pk).values("status", "centre_id").first()
        instance._previous_application_status = previous["status"] if previous else None
        instance._previous_centre_id = previous["centre_id"] if previous else None
    else:
        instance._previous_application_status = None
        instance._previous_centre_id = None


def _queue_application_confirmation_email(application_id):
    try:
        from .tasks import send_exam_application_confirmation_email

        send_exam_application_confirmation_email.delay(application_id)
    except Exception:
        logger.exception("Could not queue enrollment confirmation email for application id=%s", application_id)
        ExamApplication.objects.filter(pk=application_id).update(
            application_confirmation_email_last_error="Email could not be queued. Check the Celery broker/worker."
        )


@receiver(post_save, sender=ExamApplication)
def queue_application_confirmation_when_submitted(sender, instance, created, **kwargs):
    if instance.status not in [ExamApplication.Status.SUBMITTED, ExamApplication.Status.RESUBMITTED]:
        return
    previous_status = getattr(instance, "_previous_application_status", None)
    if not created and previous_status == instance.status:
        return
    transaction.on_commit(lambda application_id=instance.pk: _queue_application_confirmation_email(application_id))
