from django.db import models
from django.contrib.auth.models import User
from core.models import MediaAsset

# Re-export existing api models so CMS module has direct access
from api.models import ManagementMember, GalleryImage, Volunteer, NewsTicker, Event

__all__ = [
    "ManagementMember", "GalleryImage", "Volunteer", "NewsTicker", "Event",
    "SiteSettings", "SEODefaults", "Page", "PageVersion", "PageSection",
    "ContentBlock", "Banner", "Announcement", "NavigationMenu", "MenuItem",
    "Testimonial", "Gallery", "GalleryItem",
]


class SiteSettings(models.Model):
    """Singleton — only one row should exist."""
    site_name = models.CharField(max_length=200, default="HBPL")
    site_tagline = models.CharField(max_length=300, blank=True)
    logo = models.ForeignKey(MediaAsset, null=True, blank=True, on_delete=models.SET_NULL, related_name="site_logo")
    favicon = models.ForeignKey(MediaAsset, null=True, blank=True, on_delete=models.SET_NULL, related_name="site_favicon")
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    facebook_url = models.URLField(blank=True)
    twitter_url = models.URLField(blank=True)
    instagram_url = models.URLField(blank=True)
    youtube_url = models.URLField(blank=True)
    whatsapp_number = models.CharField(max_length=20, blank=True)
    google_analytics_id = models.CharField(max_length=50, blank=True)
    maintenance_mode = models.BooleanField(default=False)
    maintenance_message = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)

    class Meta:
        db_table = "cms_site_settings"
        verbose_name = "Site Settings"
        verbose_name_plural = "Site Settings"


class SEODefaults(models.Model):
    page_type = models.CharField(max_length=50, unique=True)
    meta_title = models.CharField(max_length=200, blank=True)
    meta_description = models.TextField(blank=True)
    og_image = models.ForeignKey(MediaAsset, null=True, blank=True, on_delete=models.SET_NULL)
    schema_json = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "cms_seo_defaults"

    def __str__(self):
        return self.page_type


class Page(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    title = models.CharField(max_length=300)
    slug = models.SlugField(max_length=300, unique=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    template = models.CharField(max_length=100, default="default")
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="children")
    meta_title = models.CharField(max_length=200, blank=True)
    meta_description = models.TextField(blank=True)
    og_image = models.ForeignKey(MediaAsset, null=True, blank=True, on_delete=models.SET_NULL)
    sort_order = models.PositiveIntegerField(default=0)
    is_in_nav = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="pages_created")
    updated_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="pages_updated")
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "cms_page"
        ordering = ["sort_order", "title"]
        indexes = [models.Index(fields=["slug"]), models.Index(fields=["status"])]

    def __str__(self):
        return self.title


class PageVersion(models.Model):
    page = models.ForeignKey(Page, on_delete=models.CASCADE, related_name="versions")
    version_number = models.PositiveIntegerField()
    content_snapshot = models.JSONField(default=dict)
    created_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    note = models.CharField(max_length=300, blank=True)

    class Meta:
        db_table = "cms_page_version"
        ordering = ["-version_number"]
        unique_together = [("page", "version_number")]


class PageSection(models.Model):
    page = models.ForeignKey(Page, on_delete=models.CASCADE, related_name="sections")
    name = models.CharField(max_length=100)
    sort_order = models.PositiveIntegerField(default=0)
    is_visible = models.BooleanField(default=True)

    class Meta:
        db_table = "cms_page_section"
        ordering = ["sort_order"]

    def __str__(self):
        return f"{self.page.title} / {self.name}"


class ContentBlock(models.Model):
    class BlockType(models.TextChoices):
        HERO = "hero", "Hero"
        TEXT = "text", "Text"
        IMAGE = "image", "Image"
        VIDEO = "video", "Video"
        CARDS = "cards", "Cards"
        FAQ = "faq", "FAQ"
        STATS = "stats", "Stats"
        TESTIMONIALS = "testimonials", "Testimonials"
        CTA = "cta", "Call to Action"
        HTML = "html", "Raw HTML"

    section = models.ForeignKey(PageSection, on_delete=models.CASCADE, related_name="blocks")
    block_type = models.CharField(max_length=30, choices=BlockType.choices)
    data = models.JSONField(default=dict)
    sort_order = models.PositiveIntegerField(default=0)
    is_visible = models.BooleanField(default=True)
    css_classes = models.CharField(max_length=300, blank=True)

    class Meta:
        db_table = "cms_content_block"
        ordering = ["sort_order"]


class Banner(models.Model):
    class Position(models.TextChoices):
        HOME_HERO = "home_hero", "Home Hero"
        HOME_MID = "home_mid", "Home Middle"
        SIDEBAR = "sidebar", "Sidebar"
        CRICKET_TOP = "cricket_top", "Cricket Top"
        EXAM_TOP = "exam_top", "Exam Top"

    title = models.CharField(max_length=300)
    subtitle = models.CharField(max_length=500, blank=True)
    image = models.ForeignKey(MediaAsset, null=True, blank=True, on_delete=models.SET_NULL)
    cta_text = models.CharField(max_length=100, blank=True)
    cta_url = models.CharField(max_length=500, blank=True)
    position = models.CharField(max_length=30, choices=Position.choices)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "cms_banner"
        ordering = ["position", "sort_order"]

    def __str__(self):
        return f"{self.title} ({self.position})"


class Announcement(models.Model):
    class Priority(models.TextChoices):
        LOW = "low", "Low"
        NORMAL = "normal", "Normal"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"

    title = models.CharField(max_length=300)
    body = models.TextField()
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.NORMAL)
    is_active = models.BooleanField(default=True)
    show_on_home = models.BooleanField(default=True)
    show_popup = models.BooleanField(default=False)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "cms_announcement"
        ordering = ["-priority", "-created_at"]

    def __str__(self):
        return self.title


class NavigationMenu(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "cms_navigation_menu"

    def __str__(self):
        return self.name


class MenuItem(models.Model):
    menu = models.ForeignKey(NavigationMenu, on_delete=models.CASCADE, related_name="items")
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE, related_name="children")
    label = models.CharField(max_length=200)
    url = models.CharField(max_length=500, blank=True)
    page = models.ForeignKey(Page, null=True, blank=True, on_delete=models.SET_NULL)
    icon = models.CharField(max_length=100, blank=True)
    open_in_new_tab = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)
    is_visible = models.BooleanField(default=True)

    class Meta:
        db_table = "cms_menu_item"
        ordering = ["sort_order"]

    def __str__(self):
        return self.label


class Testimonial(models.Model):
    name = models.CharField(max_length=200)
    designation = models.CharField(max_length=200, blank=True)
    organization = models.CharField(max_length=200, blank=True)
    avatar = models.ForeignKey(MediaAsset, null=True, blank=True, on_delete=models.SET_NULL)
    quote = models.TextField()
    rating = models.PositiveSmallIntegerField(default=5)
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "cms_testimonial"
        ordering = ["sort_order", "-created_at"]

    def __str__(self):
        return self.name


class Gallery(models.Model):
    title = models.CharField(max_length=300)
    slug = models.SlugField(max_length=300, unique=True)
    description = models.TextField(blank=True)
    cover = models.ForeignKey(MediaAsset, null=True, blank=True, on_delete=models.SET_NULL, related_name="gallery_cover")
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "cms_gallery"
        ordering = ["sort_order", "-created_at"]

    def __str__(self):
        return self.title


class GalleryItem(models.Model):
    gallery = models.ForeignKey(Gallery, on_delete=models.CASCADE, related_name="items")
    asset = models.ForeignKey(MediaAsset, on_delete=models.CASCADE)
    caption = models.CharField(max_length=300, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "cms_gallery_item"
        ordering = ["sort_order"]
