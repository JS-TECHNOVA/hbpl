from django.contrib import admin
from import_export.admin import ImportExportModelAdmin, ExportMixin
from .models import (
    SiteSettings, SEODefaults, Page, PageVersion, PageSection,
    ContentBlock, Banner, Announcement, NavigationMenu, MenuItem,
    Testimonial, Gallery, GalleryItem,
)
from .resources import (
    PageResource, BannerResource, AnnouncementResource,
    TestimonialResource, SEODefaultsResource, GalleryResource,
)


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    list_display = ["site_name", "contact_email", "maintenance_mode", "updated_at"]

    def has_add_permission(self, request):
        return not SiteSettings.objects.exists()


@admin.register(SEODefaults)
class SEODefaultsAdmin(ImportExportModelAdmin):
    resource_classes = [SEODefaultsResource]
    list_display = ["page_type", "meta_title", "updated_at"]
    search_fields = ["page_type", "meta_title"]


class PageSectionInline(admin.TabularInline):
    model = PageSection
    extra = 0


@admin.register(Page)
class PageAdmin(ImportExportModelAdmin):
    resource_classes = [PageResource]
    list_display = ["title", "slug", "status", "template", "is_in_nav", "sort_order", "updated_at"]
    list_filter = ["status", "template", "is_in_nav"]
    search_fields = ["title", "slug"]
    prepopulated_fields = {"slug": ("title",)}
    inlines = [PageSectionInline]
    readonly_fields = ["created_at", "updated_at", "published_at"]


@admin.register(Banner)
class BannerAdmin(ImportExportModelAdmin):
    resource_classes = [BannerResource]
    list_display = ["title", "position", "is_active", "sort_order", "start_date", "end_date"]
    list_filter = ["position", "is_active"]
    search_fields = ["title"]


@admin.register(Announcement)
class AnnouncementAdmin(ImportExportModelAdmin):
    resource_classes = [AnnouncementResource]
    list_display = ["title", "priority", "is_active", "show_on_home", "show_popup", "created_at"]
    list_filter = ["priority", "is_active", "show_on_home"]
    search_fields = ["title"]


class MenuItemInline(admin.TabularInline):
    model = MenuItem
    extra = 0
    fk_name = "menu"


@admin.register(NavigationMenu)
class NavigationMenuAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "is_active"]
    inlines = [MenuItemInline]


@admin.register(Testimonial)
class TestimonialAdmin(ImportExportModelAdmin):
    resource_classes = [TestimonialResource]
    list_display = ["name", "designation", "organization", "rating", "is_featured", "is_active"]
    list_filter = ["is_featured", "is_active"]
    search_fields = ["name", "organization"]


class GalleryItemInline(admin.TabularInline):
    model = GalleryItem
    extra = 0


@admin.register(Gallery)
class GalleryAdmin(ImportExportModelAdmin):
    resource_classes = [GalleryResource]
    list_display = ["title", "slug", "is_active", "sort_order", "created_at"]
    prepopulated_fields = {"slug": ("title",)}
    inlines = [GalleryItemInline]
