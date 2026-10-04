from django.contrib import admin
from django import forms
from import_export.admin import ImportExportModelAdmin, ExportMixin
from .models import (
    MediaFolder, MediaAsset, AdminRole, AdminPermission,
    AdminRolePermission, AdminProfile, AuditLog, SystemConfig,
    NotificationTemplate, Notification,
)
from .resources import (
    MediaAssetResource, AdminRoleResource, AdminPermissionResource,
    AdminProfileResource, AuditLogResource, SystemConfigResource,
    NotificationTemplateResource,
)
from .models import EmailServiceConfiguration


class EmailServiceConfigurationForm(forms.ModelForm):
    smtp_password = forms.CharField(
        required=False,
        strip=False,
        widget=forms.PasswordInput(render_value=False),
        help_text="Leave blank to keep the current password. The value is encrypted before storage.",
    )
    clear_smtp_password = forms.BooleanField(required=False, label="Remove saved SMTP password")

    class Meta:
        model = EmailServiceConfiguration
        exclude = ["encrypted_password"]

    def save(self, commit=True):
        instance = super().save(commit=False)
        if self.cleaned_data.get("clear_smtp_password"):
            instance.set_smtp_password("")
        elif self.cleaned_data.get("smtp_password"):
            instance.set_smtp_password(self.cleaned_data["smtp_password"])
        if commit:
            instance.save()
            self.save_m2m()
        return instance


@admin.register(EmailServiceConfiguration)
class EmailServiceConfigurationAdmin(admin.ModelAdmin):
    form = EmailServiceConfigurationForm
    list_display = ["name", "host", "port", "username", "is_active", "updated_at"]
    list_filter = ["is_active", "use_tls", "use_ssl"]
    search_fields = ["name", "host", "username", "from_email"]
    readonly_fields = ["created_at", "updated_at"]
    fieldsets = (
        ("SMTP server", {"fields": ("name", "host", "port", "username", "smtp_password", "clear_smtp_password", "use_tls", "use_ssl", "timeout_seconds")}),
        ("Sender", {"fields": ("from_name", "from_email", "is_active")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )


@admin.register(MediaFolder)
class MediaFolderAdmin(ImportExportModelAdmin):
    list_display = ["name", "parent", "slug", "created_at"]
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ["name"]


@admin.register(MediaAsset)
class MediaAssetAdmin(ImportExportModelAdmin):
    resource_classes = [MediaAssetResource]
    list_display = ["name", "asset_type", "folder", "file_size", "uploaded_by", "created_at"]
    list_filter = ["asset_type", "folder"]
    search_fields = ["name", "alt_text"]
    readonly_fields = ["file_size", "mime_type", "width", "height", "created_at", "updated_at"]


@admin.register(AdminRole)
class AdminRoleAdmin(ImportExportModelAdmin):
    resource_classes = [AdminRoleResource]
    list_display = ["name", "slug", "is_system", "created_at"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(AdminPermission)
class AdminPermissionAdmin(ImportExportModelAdmin):
    resource_classes = [AdminPermissionResource]
    list_display = ["code", "name", "module"]
    list_filter = ["module"]
    search_fields = ["code", "name"]


@admin.register(AdminProfile)
class AdminProfileAdmin(ImportExportModelAdmin):
    resource_classes = [AdminProfileResource]
    list_display = ["user", "role", "is_active", "created_at"]
    list_filter = ["role", "is_active"]
    search_fields = ["user__username", "user__email"]


@admin.register(AuditLog)
class AuditLogAdmin(ExportMixin, admin.ModelAdmin):
    resource_classes = [AuditLogResource]
    list_display = ["user", "action", "model_name", "object_repr", "ip_address", "timestamp"]
    list_filter = ["action", "model_name"]
    search_fields = ["user__username", "model_name", "object_repr"]
    readonly_fields = ["user", "action", "model_name", "object_id", "object_repr", "changes",
                       "ip_address", "user_agent", "timestamp"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(SystemConfig)
class SystemConfigAdmin(ImportExportModelAdmin):
    resource_classes = [SystemConfigResource]
    list_display = ["key", "value_type", "is_public", "updated_at"]
    list_filter = ["value_type", "is_public"]
    search_fields = ["key", "description"]


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(ImportExportModelAdmin):
    resource_classes = [NotificationTemplateResource]
    list_display = ["name", "channel", "is_active", "created_at"]
    list_filter = ["channel", "is_active"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Notification)
class NotificationAdmin(ExportMixin, admin.ModelAdmin):
    list_display = ["recipient", "channel", "status", "created_at"]
    list_filter = ["channel", "status"]
    search_fields = ["recipient__username", "subject"]
    readonly_fields = ["sent_at", "read_at", "created_at"]
