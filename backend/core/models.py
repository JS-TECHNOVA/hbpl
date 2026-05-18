from django.db import models
from django.contrib.auth.models import User


class MediaFolder(models.Model):
    name = models.CharField(max_length=200)
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE, related_name="children")
    slug = models.SlugField(max_length=200, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "core_media_folder"
        ordering = ["name"]

    def __str__(self):
        return self.name


class MediaAsset(models.Model):
    class AssetType(models.TextChoices):
        IMAGE = "image", "Image"
        VIDEO = "video", "Video"
        DOCUMENT = "document", "Document"
        AUDIO = "audio", "Audio"
        OTHER = "other", "Other"

    folder = models.ForeignKey(MediaFolder, null=True, blank=True, on_delete=models.SET_NULL, related_name="assets")
    name = models.CharField(max_length=300)
    file = models.FileField(upload_to="media_assets/")
    asset_type = models.CharField(max_length=20, choices=AssetType.choices, default=AssetType.IMAGE)
    mime_type = models.CharField(max_length=100, blank=True)
    file_size = models.PositiveBigIntegerField(default=0)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    alt_text = models.CharField(max_length=300, blank=True)
    caption = models.TextField(blank=True)
    uploaded_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="media_assets")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "core_media_asset"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class AdminRole(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_system = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "core_admin_role"
        ordering = ["name"]

    def __str__(self):
        return self.name


class AdminPermission(models.Model):
    code = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=200)
    module = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "core_admin_permission"
        ordering = ["module", "code"]

    def __str__(self):
        return f"{self.module}.{self.code}"


class AdminRolePermission(models.Model):
    role = models.ForeignKey(AdminRole, on_delete=models.CASCADE, related_name="role_permissions")
    permission = models.ForeignKey(AdminPermission, on_delete=models.CASCADE, related_name="role_permissions")

    class Meta:
        db_table = "core_admin_role_permission"
        unique_together = [("role", "permission")]


class AdminProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="admin_profile")
    role = models.ForeignKey(AdminRole, null=True, on_delete=models.SET_NULL, related_name="profiles")
    phone = models.CharField(max_length=15, blank=True)
    avatar = models.ForeignKey(MediaAsset, null=True, blank=True, on_delete=models.SET_NULL)
    is_active = models.BooleanField(default=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "core_admin_profile"

    def __str__(self):
        return f"{self.user.username} ({self.role})"


class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE = "create", "Create"
        UPDATE = "update", "Update"
        DELETE = "delete", "Delete"
        LOGIN = "login", "Login"
        LOGOUT = "logout", "Logout"
        EXPORT = "export", "Export"
        IMPORT = "import", "Import"

    user = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="audit_logs")
    action = models.CharField(max_length=20, choices=Action.choices)
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=50, blank=True)
    object_repr = models.CharField(max_length=500, blank=True)
    changes = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "core_audit_log"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["model_name", "object_id"]),
            models.Index(fields=["user", "timestamp"]),
            models.Index(fields=["timestamp"]),
        ]


class SystemConfig(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    value_type = models.CharField(max_length=20, default="string",
                                  choices=[("string", "String"), ("integer", "Integer"),
                                           ("boolean", "Boolean"), ("json", "JSON")])
    description = models.TextField(blank=True)
    is_public = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)

    class Meta:
        db_table = "core_system_config"
        ordering = ["key"]

    def __str__(self):
        return self.key


class NotificationTemplate(models.Model):
    class Channel(models.TextChoices):
        EMAIL = "email", "Email"
        SMS = "sms", "SMS"
        PUSH = "push", "Push"
        IN_APP = "in_app", "In-App"

    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    channel = models.CharField(max_length=20, choices=Channel.choices)
    subject = models.CharField(max_length=300, blank=True)
    body = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "core_notification_template"

    def __str__(self):
        return f"{self.name} ({self.channel})"


class Notification(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"
        READ = "read", "Read"

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    template = models.ForeignKey(NotificationTemplate, null=True, on_delete=models.SET_NULL)
    channel = models.CharField(max_length=20, choices=NotificationTemplate.Channel.choices)
    subject = models.CharField(max_length=300, blank=True)
    body = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    read_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "core_notification"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "status"]),
            models.Index(fields=["created_at"]),
        ]
