from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "api"

    def ready(self):
        # Attach the pre_save hook that snapshots result_status before each save
        # so signals.py can detect when status changes to 'published'.
        from django.db.models.signals import pre_save
        from .models import ExamRegistration

        def _snapshot_result_status(sender, instance, **kwargs):
            if instance.pk:
                try:
                    old = sender.objects.get(pk=instance.pk)
                    instance._pre_save_result_status = old.result_status
                    instance._pre_save_publish_cert = old.publish_participation_certificate
                except sender.DoesNotExist:
                    instance._pre_save_result_status = None
                    instance._pre_save_publish_cert = False
            else:
                instance._pre_save_result_status = None
                instance._pre_save_publish_cert = False

        pre_save.connect(_snapshot_result_status, sender=ExamRegistration, weak=False)

        # Import signals to register post_save receivers.
        import api.signals  # noqa: F401
