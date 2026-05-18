from import_export import resources, fields
from import_export.widgets import ForeignKeyWidget, ManyToManyWidget
from django.contrib.auth.models import User
from .models import (
    MediaFolder, MediaAsset, AdminRole, AdminPermission,
    AdminProfile, AuditLog, SystemConfig, NotificationTemplate, Notification,
)

# Column aliases: maps any incoming header variant → canonical field name
# Used in before_import_row() to normalise third-party or hand-crafted CSVs.
_MEDIA_ASSET_MAP = {
    "file name": "name",
    "filename": "name",
    "asset name": "name",
    "type": "asset_type",
    "kind": "asset_type",
    "alt": "alt_text",
    "alternative text": "alt_text",
}

_SYSTEM_CONFIG_MAP = {
    "config key": "key",
    "setting key": "key",
    "config value": "value",
    "setting value": "value",
    "public": "is_public",
}


def _remap(row, alias_map):
    """Rename row keys according to alias_map (lower-stripped key lookup)."""
    return {alias_map.get(k.lower().strip(), k): v for k, v in row.items()}


class MediaAssetResource(resources.ModelResource):
    folder = fields.Field(
        column_name="folder",
        attribute="folder",
        widget=ForeignKeyWidget(MediaFolder, field="slug"),
    )
    uploaded_by = fields.Field(
        column_name="uploaded_by",
        attribute="uploaded_by",
        widget=ForeignKeyWidget(User, field="username"),
    )

    class Meta:
        model = MediaAsset
        fields = ("id", "name", "folder", "asset_type", "alt_text", "caption", "uploaded_by")
        export_order = ("id", "name", "asset_type", "folder", "alt_text", "caption", "uploaded_by")
        import_id_fields = ("name",)

    def before_import_row(self, row, row_number=None, **kwargs):
        row.update(_remap(row, _MEDIA_ASSET_MAP))


class AdminRoleResource(resources.ModelResource):
    class Meta:
        model = AdminRole
        fields = ("id", "name", "slug", "description", "is_system")
        import_id_fields = ("slug",)


class AdminPermissionResource(resources.ModelResource):
    class Meta:
        model = AdminPermission
        fields = ("id", "code", "name", "module")
        import_id_fields = ("code",)


class AdminProfileResource(resources.ModelResource):
    user = fields.Field(
        column_name="username",
        attribute="user",
        widget=ForeignKeyWidget(User, field="username"),
    )
    role = fields.Field(
        column_name="role",
        attribute="role",
        widget=ForeignKeyWidget(AdminRole, field="slug"),
    )

    class Meta:
        model = AdminProfile
        fields = ("id", "user", "role", "phone", "is_active")
        import_id_fields = ("user",)


class SystemConfigResource(resources.ModelResource):
    class Meta:
        model = SystemConfig
        fields = ("id", "key", "value", "value_type", "description", "is_public")
        import_id_fields = ("key",)

    def before_import_row(self, row, row_number=None, **kwargs):
        row.update(_remap(row, _SYSTEM_CONFIG_MAP))


class AuditLogResource(resources.ModelResource):
    """Export-only: audit logs should never be bulk-imported."""
    user = fields.Field(
        column_name="username",
        attribute="user",
        widget=ForeignKeyWidget(User, field="username"),
    )

    class Meta:
        model = AuditLog
        fields = ("id", "user", "action", "model_name", "object_id", "object_repr", "ip_address", "timestamp")
        export_order = fields

    def get_import_fields(self):
        return []  # disable import


class NotificationTemplateResource(resources.ModelResource):
    class Meta:
        model = NotificationTemplate
        fields = ("id", "name", "slug", "channel", "subject", "body", "is_active")
        import_id_fields = ("slug",)
