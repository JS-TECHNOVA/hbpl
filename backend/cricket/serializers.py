from rest_framework import serializers
from .models import (
    Tournament, Team, Player, Match,
    MatchPlayingXI, BattingScorecard, BowlingScorecard,
    BallCommentary, InningsExtras, PlayerTournamentStats,
)

WICKET_TYPE_ROLE = {"wicket_keeper", "wicket_keeper_batsman"}


class TournamentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tournament
        fields = "__all__"


class PlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = "__all__"


class PlayerBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = ["id", "name", "jersey_number", "role", "photo_url"]


class TeamSerializer(serializers.ModelSerializer):
    players = PlayerBriefSerializer(many=True, read_only=True)
    captain = PlayerBriefSerializer(read_only=True)
    vice_captain = PlayerBriefSerializer(read_only=True)
    wicket_keeper = PlayerBriefSerializer(read_only=True)

    class Meta:
        model = Team
        fields = "__all__"


class TeamBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ["id", "name", "short_name", "logo_url"]


class MatchPlayingXISerializer(serializers.ModelSerializer):
    player = PlayerBriefSerializer(read_only=True)

    class Meta:
        model = MatchPlayingXI
        fields = ["id", "player", "batting_order", "is_impact_player"]


class BattingScorecardSerializer(serializers.ModelSerializer):
    player = PlayerBriefSerializer(read_only=True)
    dismissed_by_bowler = PlayerBriefSerializer(read_only=True)
    fielder = PlayerBriefSerializer(read_only=True)
    strike_rate = serializers.FloatField(read_only=True)

    class Meta:
        model = BattingScorecard
        fields = [
            "id", "player", "runs", "balls_faced", "fours", "sixes",
            "is_out", "out_reason", "wicket_type", "dismissed_by_bowler",
            "fielder", "batting_position", "did_not_bat", "strike_rate",
        ]


class BowlingScorecardSerializer(serializers.ModelSerializer):
    player = PlayerBriefSerializer(read_only=True)
    overs_bowled = serializers.CharField(read_only=True)
    economy = serializers.FloatField(read_only=True)

    class Meta:
        model = BowlingScorecard
        fields = [
            "id", "player", "overs_bowled", "maidens", "runs_given",
            "wickets", "wides", "no_balls", "economy",
        ]


class BallCommentarySerializer(serializers.ModelSerializer):
    batsman = PlayerBriefSerializer(read_only=True)
    bowler = PlayerBriefSerializer(read_only=True)
    dismissed_player = PlayerBriefSerializer(read_only=True)
    over_ball_text = serializers.CharField(read_only=True)

    class Meta:
        model = BallCommentary
        fields = [
            "id", "innings_number", "over_number", "ball_number", "over_ball_text",
            "batsman", "bowler", "runs_scored", "extras", "extra_type",
            "is_wicket", "wicket_type", "dismissed_player", "fielder",
            "is_four", "is_six", "commentary_text",
            "total_score_after", "total_wickets_after", "created_at",
        ]


class InningsExtrasSerializer(serializers.ModelSerializer):
    total = serializers.IntegerField(read_only=True)

    class Meta:
        model = InningsExtras
        fields = ["wides", "no_balls", "leg_byes", "byes", "penalty", "total"]


class MatchSerializer(serializers.ModelSerializer):
    team1 = TeamBriefSerializer(read_only=True)
    team2 = TeamBriefSerializer(read_only=True)
    tournament = TournamentSerializer(read_only=True)
    winner = TeamBriefSerializer(read_only=True)
    innings1_team = TeamBriefSerializer(read_only=True)
    innings2_team = TeamBriefSerializer(read_only=True)
    run_rate = serializers.FloatField(read_only=True)
    required_run_rate = serializers.FloatField(read_only=True)

    class Meta:
        model = Match
        fields = "__all__"


# ── Live score (WebSocket + live match page) ─────────────────────────────────

class LiveScoreSerializer(serializers.ModelSerializer):
    team1 = TeamBriefSerializer(read_only=True)
    team2 = TeamBriefSerializer(read_only=True)
    innings1_team = TeamBriefSerializer(read_only=True)
    innings2_team = TeamBriefSerializer(read_only=True)
    batting_team = TeamBriefSerializer(read_only=True)
    bowling_team = TeamBriefSerializer(read_only=True)
    winner = TeamBriefSerializer(read_only=True)
    man_of_match = PlayerBriefSerializer(read_only=True)
    innings1 = serializers.SerializerMethodField()
    innings2 = serializers.SerializerMethodField()
    current_batsmen = serializers.SerializerMethodField()
    current_bowler_stats = serializers.SerializerMethodField()
    recent_commentary = serializers.SerializerMethodField()
    man_of_match_stats = serializers.SerializerMethodField()
    run_rate = serializers.FloatField(read_only=True)
    required_run_rate = serializers.FloatField(read_only=True)

    class Meta:
        model = Match
        fields = [
            "id", "title", "match_number", "status", "format", "total_overs",
            "team1", "team2", "innings1_team", "innings2_team",
            "batting_team", "bowling_team",
            "innings1_score", "innings1_wickets", "innings1_overs", "innings1_extras",
            "innings2_score", "innings2_wickets", "innings2_overs", "innings2_extras",
            "current_innings", "current_over", "current_ball",
            "required_runs", "required_balls",
            "run_rate", "required_run_rate",
            "toss_winner", "toss_decision",
            "winner", "result_text", "youtube_live_id",
            "innings1", "innings2",
            "current_batsmen", "current_bowler_stats", "recent_commentary",
            "man_of_match", "man_of_match_stats",
        ]

    def _innings_data(self, match, innings_number, team):
        batting = list(BattingScorecard.objects.filter(
            match=match, innings_number=innings_number
        ).select_related("player", "dismissed_by_bowler", "fielder").order_by("batting_position"))
        bowling = BowlingScorecard.objects.filter(
            match=match, innings_number=innings_number
        ).select_related("player")
        extras = InningsExtras.objects.filter(match=match, innings_number=innings_number).first()

        batting_data = BattingScorecardSerializer(batting, many=True).data

        # Append yet-to-bat players from Playing XI
        if team:
            batted_ids = {str(b.player_id) for b in batting}
            xi = MatchPlayingXI.objects.filter(
                match=match, team=team
            ).select_related("player").order_by("batting_order")
            for xi_entry in xi:
                pid = str(xi_entry.player_id)
                if pid not in batted_ids:
                    p = xi_entry.player
                    batting_data.append({
                        "id": pid,
                        "player": {
                            "id": pid,
                            "name": p.name,
                            "jersey_number": p.jersey_number,
                            "role": p.role,
                            "photo_url": p.photo_url or "",
                        },
                        "runs": 0, "balls_faced": 0, "fours": 0, "sixes": 0,
                        "is_out": False, "out_reason": "", "wicket_type": "",
                        "dismissed_by_bowler": None, "fielder": None,
                        "batting_position": 99, "did_not_bat": True, "strike_rate": 0.0,
                    })

        return {
            "batting": batting_data,
            "bowling": BowlingScorecardSerializer(bowling, many=True).data,
            "extras": InningsExtrasSerializer(extras).data if extras else None,
        }

    def get_innings1(self, match):
        return self._innings_data(match, 1, match.innings1_team)

    def get_innings2(self, match):
        if match.current_innings < 2 and match.innings2_score == 0:
            return None
        return self._innings_data(match, 2, match.innings2_team)

    def get_current_batsmen(self, match):
        result = []
        players = [match.current_batsman1, match.current_batsman2]
        for slot_idx, player in enumerate(players):
            if not player:
                continue
            card = BattingScorecard.objects.filter(
                match=match, innings_number=match.current_innings, player=player,
            ).first()
            if card:
                entry = dict(BattingScorecardSerializer(card).data)
            else:
                entry = {
                    "id": str(player.id),
                    "player": {
                        "id": str(player.id), "name": player.name,
                        "jersey_number": player.jersey_number,
                        "role": player.role, "photo_url": player.photo_url or "",
                    },
                    "runs": 0, "balls_faced": 0, "fours": 0, "sixes": 0,
                    "is_out": False, "strike_rate": 0.0,
                }
            entry["is_striker"] = (slot_idx == match.striker_slot)
            result.append(entry)
        return result

    def get_current_bowler_stats(self, match):
        if not match.current_bowler:
            return None
        card = BowlingScorecard.objects.filter(
            match=match, innings_number=match.current_innings, player=match.current_bowler,
        ).first()
        if card:
            return BowlingScorecardSerializer(card).data
        p = match.current_bowler
        return {
            "id": str(p.id),
            "player": {
                "id": str(p.id), "name": p.name,
                "jersey_number": p.jersey_number,
                "role": p.role, "photo_url": p.photo_url or "",
            },
            "overs_bowled": "0.0", "maidens": 0, "runs_given": 0,
            "wickets": 0, "wides": 0, "no_balls": 0, "economy": 0.0,
        }

    def get_recent_commentary(self, match):
        balls = BallCommentary.objects.filter(
            match=match, innings_number=match.current_innings
        ).select_related("batsman", "bowler", "dismissed_player")[:12]
        return BallCommentarySerializer(balls, many=True).data

    def get_man_of_match_stats(self, match):
        if not match.man_of_match:
            return None
        card = BattingScorecard.objects.filter(match=match, player=match.man_of_match).first()
        if not card:
            return None
        return {
            "runs": card.runs,
            "balls_faced": card.balls_faced,
            "fours": card.fours,
            "sixes": card.sixes,
            "is_out": card.is_out,
            "strike_rate": float(card.strike_rate),
        }


# ── Ball entry (admin scorer) ─────────────────────────────────────────────────

class BallEntrySerializer(serializers.Serializer):
    batsman_id = serializers.UUIDField()
    bowler_id = serializers.UUIDField()
    runs_scored = serializers.IntegerField(min_value=0, max_value=6)
    extra_type = serializers.ChoiceField(
        choices=["none", "wide", "no_ball", "leg_bye", "bye"], default="none"
    )
    extras = serializers.IntegerField(min_value=0, default=0)
    is_wicket = serializers.BooleanField(default=False)
    wicket_type = serializers.CharField(allow_blank=True, default="")
    dismissed_player_id = serializers.UUIDField(allow_null=True, required=False)
    fielder_id = serializers.UUIDField(allow_null=True, required=False)


class TossSerializer(serializers.Serializer):
    toss_winner_id = serializers.UUIDField()
    toss_decision = serializers.ChoiceField(choices=["bat", "bowl"])


class StartInningsSerializer(serializers.Serializer):
    opener1_id = serializers.UUIDField()
    opener2_id = serializers.UUIDField()
    bowler_id = serializers.UUIDField()


class SetBatsmanSerializer(serializers.Serializer):
    player_id = serializers.UUIDField()
    slot = serializers.ChoiceField(choices=["batsman1", "batsman2"])


class SetBowlerSerializer(serializers.Serializer):
    player_id = serializers.UUIDField()


class MatchWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Match
        fields = [
            "team1", "team2", "tournament", "match_number", "title",
            "format", "total_overs", "match_date", "venue", "youtube_live_id",
            "man_of_match",
        ]


class PointsTableEntrySerializer(serializers.Serializer):
    team = TeamBriefSerializer()
    played = serializers.IntegerField()
    won = serializers.IntegerField()
    lost = serializers.IntegerField()
    tied = serializers.IntegerField()
    no_result = serializers.IntegerField()
    points = serializers.IntegerField()
    nrr = serializers.FloatField()


# ── Public team registration ──────────────────────────────────────────────────

class PlayerRegistrationSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    role = serializers.ChoiceField(
        choices=["batsman", "bowler", "all_rounder", "wicket_keeper", "wicket_keeper_batsman"],
        default="batsman",
    )
    jersey_number = serializers.IntegerField(min_value=1, max_value=99, required=False, allow_null=True)
    batting_style = serializers.ChoiceField(
        choices=["right_hand", "left_hand"], default="right_hand"
    )
    bowling_style = serializers.ChoiceField(
        choices=["right_arm_fast", "right_arm_medium", "right_arm_off_spin", "right_arm_leg_spin",
                 "left_arm_fast", "left_arm_medium", "left_arm_spin", "none"],
        default="none",
    )


class PublicTeamRegistrationSerializer(serializers.Serializer):
    tournament = serializers.UUIDField()
    name = serializers.CharField(max_length=200)
    short_name = serializers.CharField(max_length=10, allow_blank=True, default="")
    home_city = serializers.CharField(max_length=100, allow_blank=True, default="")
    jersey_color = serializers.CharField(max_length=50, allow_blank=True, default="")
    contact_name = serializers.CharField(max_length=200, allow_blank=True, default="")
    contact_email = serializers.EmailField(allow_blank=True, default="")
    contact_phone = serializers.CharField(max_length=20, allow_blank=True, default="")
    players = PlayerRegistrationSerializer(many=True, required=False, default=list)


# ── Player tournament stats ───────────────────────────────────────────────────

class PlayerTournamentStatsSerializer(serializers.ModelSerializer):
    player = PlayerBriefSerializer(read_only=True)
    team = TeamBriefSerializer(read_only=True)
    batting_average = serializers.FloatField(read_only=True, allow_null=True)
    batting_strike_rate = serializers.FloatField(read_only=True)
    bowling_average = serializers.FloatField(read_only=True, allow_null=True)
    bowling_strike_rate = serializers.FloatField(read_only=True, allow_null=True)
    economy = serializers.FloatField(read_only=True)
    best_bowling = serializers.CharField(read_only=True, allow_null=True)

    class Meta:
        model = PlayerTournamentStats
        fields = [
            "id", "player", "team",
            "matches_played", "innings_batted", "not_outs",
            "runs", "highest_score", "balls_faced", "fours", "sixes", "fifties", "hundreds",
            "batting_average", "batting_strike_rate",
            "innings_bowled", "balls_bowled", "runs_given", "wickets",
            "best_wickets", "best_runs", "best_bowling", "maidens",
            "bowling_average", "economy", "bowling_strike_rate",
            "catches", "run_outs", "stumpings",
        ]


# ── Team designations ─────────────────────────────────────────────────────────

class SetDesignationsSerializer(serializers.Serializer):
    captain_id = serializers.UUIDField(allow_null=True, required=False)
    vice_captain_id = serializers.UUIDField(allow_null=True, required=False)
    wicket_keeper_id = serializers.UUIDField(allow_null=True, required=False)


# ── Playing XI ────────────────────────────────────────────────────────────────

class PlayingXIPlayerSerializer(serializers.Serializer):
    player_id = serializers.UUIDField()
    batting_order = serializers.IntegerField(min_value=1, max_value=11, required=False, allow_null=True)
    is_impact_player = serializers.BooleanField(default=False)


class PlayingXISetSerializer(serializers.Serializer):
    team_id = serializers.UUIDField()
    players = PlayingXIPlayerSerializer(many=True)


class MatchPlayingXIReadSerializer(serializers.ModelSerializer):
    player = PlayerBriefSerializer(read_only=True)

    class Meta:
        model = MatchPlayingXI
        fields = ["id", "player", "batting_order", "is_impact_player"]
