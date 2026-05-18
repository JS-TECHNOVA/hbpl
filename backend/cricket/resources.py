from import_export import resources
from .models import Tournament, Team, Player


class TournamentResource(resources.ModelResource):
    class Meta:
        model = Tournament
        fields = ("id", "title", "slug", "format", "status", "start_date", "end_date", "city", "venue")
        import_id_fields = ("slug",)


class TeamResource(resources.ModelResource):
    class Meta:
        model = Team
        fields = ("id", "name", "short_name", "tournament", "registration_status", "is_visible")
        import_id_fields = ("name", "tournament")


class PlayerResource(resources.ModelResource):
    class Meta:
        model = Player
        fields = ("id", "name", "team", "tournament", "role", "jersey_number", "batting_style", "bowling_style")
        import_id_fields = ("name", "team")
