from django.contrib import admin
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
