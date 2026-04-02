from django.conf import settings
from django.core.mail import send_mail
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import ExamRegistration, TeamRegistration


# ── Exam: registration confirmation ──────────────────────────────────────────

@receiver(post_save, sender=ExamRegistration)
def send_exam_registration_confirmation(sender, instance, created, **kwargs):
    """Send a confirmation email when a student registers for the exam."""
    if not created:
        return
    if not instance.email:
        return

    subject = "HBPL Exam — Registration Confirmed"
    message = (
        f"Dear {instance.full_name},\n\n"
        f"Your registration for the HBPL Competitive Exam has been received.\n\n"
        f"  Roll Number : {instance.roll_number}\n"
        f"  Name        : {instance.full_name}\n"
        f"  School      : {instance.school_name or '—'}\n"
        f"  Class       : {instance.class_name or '—'}\n\n"
        "Please keep your roll number safe — you will need it to check your result.\n\n"
        "We will notify you at this email address once results are published.\n\n"
        "Best regards,\n"
        "HBPL Exam Team\n"
        "https://hbpl.in"
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[instance.email],
        fail_silently=True,
    )


# ── Exam: result published notification ──────────────────────────────────────

@receiver(post_save, sender=ExamRegistration)
def send_result_published_notification(sender, instance, created, **kwargs):
    """Send a result-ready email when a student's result is published."""
    if created:
        return
    if not instance.email:
        return
    if instance.result_status != ExamRegistration.ResultStatus.PUBLISHED:
        return

    # Only send when the status just changed to published.
    # We compare against the DB value before this save.
    try:
        previous = ExamRegistration.objects.get(pk=instance.pk)
    except ExamRegistration.DoesNotExist:
        return

    # At this point `instance` already has the new value; re-fetch the old one
    # from the pre_save snapshot stored on the instance (set by apps.py).
    old_status = getattr(instance, "_pre_save_result_status", None)
    if old_status == ExamRegistration.ResultStatus.PUBLISHED:
        return  # already published before — don't re-send

    score_line = ""
    if instance.marks_obtained is not None:
        score_line = (
            f"  Marks       : {instance.marks_obtained} / {instance.total_marks}\n"
        )
    rank_line = f"  Rank        : {instance.rank}\n" if instance.rank else ""

    subject = "HBPL Exam — Your Result Has Been Published"
    message = (
        f"Dear {instance.full_name},\n\n"
        "Your result for the HBPL Competitive Exam has been published.\n\n"
        f"  Roll Number : {instance.roll_number}\n"
        f"{score_line}"
        f"{rank_line}"
        f"  Remarks     : {instance.remarks or '—'}\n\n"
        "Visit the exam portal to view your full result:\n"
        "https://hbpl.in/exam-portal/result\n\n"
        "Best regards,\n"
        "HBPL Exam Team\n"
        "https://hbpl.in"
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[instance.email],
        fail_silently=True,
    )


# ── Team: registration confirmation ──────────────────────────────────────────

@receiver(post_save, sender=TeamRegistration)
def send_team_registration_confirmation(sender, instance, created, **kwargs):
    """Send a confirmation email when a team registers."""
    if not created:
        return
    if not instance.email:
        return

    subject = "HBPL — Team Registration Received"
    message = (
        f"Dear {instance.captain_name},\n\n"
        f"We have received the registration for your team.\n\n"
        f"  Team Name   : {instance.team_name}\n"
        f"  Captain     : {instance.captain_name}\n"
        f"  Players     : {instance.player_count}\n"
        f"  Phone       : {instance.phone}\n\n"
        "Our team will review your registration and get in touch with you shortly.\n\n"
        "Best regards,\n"
        "HBPL Team\n"
        "https://hbpl.in"
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[instance.email],
        fail_silently=True,
    )
