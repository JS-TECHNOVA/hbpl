from import_export import resources, fields
from import_export.widgets import ForeignKeyWidget
from django.contrib.auth.models import User
from core.models import MediaAsset
from .models import (
    Page, Banner, Announcement, NavigationMenu, MenuItem,
    Testimonial, Gallery, GalleryItem, SiteSettings, SEODefaults,
)

_PAGE_MAP = {
    "page title": "title",
    "url slug": "slug",
    "page slug": "slug",
    "page status": "status",
    "in navigation": "is_in_nav",
    "nav": "is_in_nav",
    "meta desc": "meta_description",
    "meta description": "meta_description",
    "seo title": "meta_title",
}

_BANNER_MAP = {
    "banner title": "title",
    "sub title": "subtitle",
    "call to action": "cta_text",
    "cta link": "cta_url",
    "link": "cta_url",
    "placement": "position",
    "active": "is_active",
    "order": "sort_order",
}

_ANNOUNCEMENT_MAP = {
    "announcement title": "title",
    "message": "body",
    "content": "body",
    "importance": "priority",
    "show on homepage": "show_on_home",
    "popup": "show_popup",
}

_TESTIMONIAL_MAP = {
    "person name": "name",
    "job title": "designation",
    "company": "organization",
    "testimonial": "quote",
    "review": "quote",
    "stars": "rating",
    "featured": "is_featured",
    "active": "is_active",
}


def _remap(row, alias_map):
    return {alias_map.get(k.lower().strip(), k): v for k, v in row.items()}


class PageResource(resources.ModelResource):
    created_by = fields.Field(
        column_name="created_by",
        attribute="created_by",
        widget=ForeignKeyWidget(User, field="username"),
    )

    class Meta:
        model = Page
        fields = (
            "id", "title", "slug", "status", "template",
            "meta_title", "meta_description", "is_in_nav", "sort_order",
            "created_by", "published_at",
        )
        export_order = ("id", "title", "slug", "status", "template", "is_in_nav",
                        "sort_order", "meta_title", "meta_description", "published_at")
        import_id_fields = ("slug",)

    def before_import_row(self, row, row_number=None, **kwargs):
        row.update(_remap(row, _PAGE_MAP))


class BannerResource(resources.ModelResource):
    class Meta:
        model = Banner
        fields = ("id", "title", "subtitle", "cta_text", "cta_url",
                  "position", "is_active", "sort_order", "start_date", "end_date")
        import_id_fields = ("id",)

    def before_import_row(self, row, row_number=None, **kwargs):
        row.update(_remap(row, _BANNER_MAP))


class AnnouncementResource(resources.ModelResource):
    created_by = fields.Field(
        column_name="created_by",
        attribute="created_by",
        widget=ForeignKeyWidget(User, field="username"),
    )

    class Meta:
        model = Announcement
        fields = ("id", "title", "body", "priority", "is_active",
                  "show_on_home", "show_popup", "start_date", "end_date", "created_by")
        import_id_fields = ("id",)

    def before_import_row(self, row, row_number=None, **kwargs):
        row.update(_remap(row, _ANNOUNCEMENT_MAP))


class TestimonialResource(resources.ModelResource):
    class Meta:
        model = Testimonial
        fields = ("id", "name", "designation", "organization",
                  "quote", "rating", "is_featured", "is_active", "sort_order")
        import_id_fields = ("id",)

    def before_import_row(self, row, row_number=None, **kwargs):
        row.update(_remap(row, _TESTIMONIAL_MAP))


class SEODefaultsResource(resources.ModelResource):
    class Meta:
        model = SEODefaults
        fields = ("id", "page_type", "meta_title", "meta_description")
        import_id_fields = ("page_type",)


class GalleryResource(resources.ModelResource):
    class Meta:
        model = Gallery
        fields = ("id", "title", "slug", "description", "is_active", "sort_order")
        import_id_fields = ("slug",)
