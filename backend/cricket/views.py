from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models import Q, Sum, Count, Max
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ViewSet

from .models import (
    Tournament, Team, Player, Match,
    MatchPlayingXI, BattingScorecard, BowlingScorecard, BallCommentary, InningsExtras,
)
from .serializers import (
    TournamentSerializer, TeamSerializer, PlayerSerializer, MatchSerializer,
    MatchWriteSerializer, LiveScoreSerializer, BallEntrySerializer, TossSerializer,
    StartInningsSerializer, SetBatsmanSerializer, SetBowlerSerializer,
    BattingScorecardSerializer, BowlingScorecardSerializer,
    BallCommentarySerializer, PointsTableEntrySerializer,
    TeamBriefSerializer, PublicTeamRegistrationSerializer,
    PlayerTournamentStatsSerializer, SetDesignationsSerializer,
    PlayingXISetSerializer, MatchPlayingXIReadSerializer,
)
from .services.ball_service import BallService


# ── Public views ─────────────────────────────────────────────────────────────

class TournamentListView(generics.ListAPIView):
    queryset = Tournament.objects.all()
    serializer_class = TournamentSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class TournamentDetailView(generics.RetrieveAPIView):
    queryset = Tournament.objects.all()
    serializer_class = TournamentSerializer
    permission_classes = [AllowAny]


class TournamentPointsTableView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        tournament = get_object_or_404(Tournament, pk=pk)
        teams = Team.objects.filter(tournament=tournament, is_visible=True)
        rows = []
        for team in teams:
            matches = Match.objects.filter(
                Q(team1=team) | Q(team2=team),
                tournament=tournament,
                status="completed",
            )
            played = matches.count()
            won = matches.filter(winner=team).count()
            lost = matches.exclude(winner=team).exclude(winner=None).count()
            tied = matches.filter(winner=None).count()
            no_result = 0

            runs_scored = 0
            balls_faced = 0
            runs_conceded = 0
            balls_bowled = 0
            for m in matches:
                if m.innings1_team == team:
                    runs_scored += m.innings1_score
                    balls_faced += int(m.innings1_overs) * 6 + round((m.innings1_overs % 1) * 10)
                    runs_conceded += m.innings2_score
                    balls_bowled += int(m.innings2_overs) * 6 + round((m.innings2_overs % 1) * 10)
                else:
                    runs_scored += m.innings2_score
                    balls_faced += int(m.innings2_overs) * 6 + round((m.innings2_overs % 1) * 10)
                    runs_conceded += m.innings1_score
                    balls_bowled += int(m.innings1_overs) * 6 + round((m.innings1_overs % 1) * 10)

            overs_faced = balls_faced / 6 if balls_faced else 0
            overs_bowled = balls_bowled / 6 if balls_bowled else 0
            nrr = 0.0
            if overs_faced > 0 and overs_bowled > 0:
                nrr = round((runs_scored / overs_faced) - (runs_conceded / overs_bowled), 3)

            rows.append({
                "team": team,
                "played": played,
                "won": won,
                "lost": lost,
                "tied": tied,
                "no_result": no_result,
                "points": won * 2 + tied,
                "nrr": nrr,
            })

        rows.sort(key=lambda r: (-r["points"], -r["nrr"]))
        return Response(PointsTableEntrySerializer(rows, many=True).data)


class MatchListView(generics.ListAPIView):
    queryset = Match.objects.select_related("team1", "team2", "tournament", "winner")
    serializer_class = MatchSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        tournament_id = self.request.query_params.get("tournament")
        match_status = self.request.query_params.get("status")
        if tournament_id:
            qs = qs.filter(tournament_id=tournament_id)
        if match_status:
            qs = qs.filter(status=match_status)
        return qs


class MatchDetailView(generics.RetrieveAPIView):
    queryset = Match.objects.all()
    serializer_class = MatchSerializer
    permission_classes = [AllowAny]


class MatchLiveView(generics.RetrieveAPIView):
    queryset = Match.objects.all()
    serializer_class = LiveScoreSerializer
    permission_classes = [AllowAny]


class MatchScorecardView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        match = get_object_or_404(Match, pk=pk)
        innings_num = request.query_params.get("innings", "1")
        try:
            innings_num = int(innings_num)
        except ValueError:
            innings_num = 1

        batting = BattingScorecard.objects.filter(
            match=match, innings_number=innings_num
        ).select_related("player", "dismissed_by_bowler", "fielder").order_by("batting_position")
        bowling = BowlingScorecard.objects.filter(
            match=match, innings_number=innings_num
        ).select_related("player")
        extras = InningsExtras.objects.filter(match=match, innings_number=innings_num).first()
        return Response({
            "batting": BattingScorecardSerializer(batting, many=True).data,
            "bowling": BowlingScorecardSerializer(bowling, many=True).data,
            "extras": {"wides": extras.wides, "no_balls": extras.no_balls,
                       "leg_byes": extras.leg_byes, "byes": extras.byes,
                       "total": extras.total} if extras else None,
        })


class MatchCommentaryView(generics.ListAPIView):
    serializer_class = BallCommentarySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return BallCommentary.objects.filter(
            match_id=self.kwargs["pk"]
        ).select_related("batsman", "bowler", "dismissed_player").order_by("-over_number", "-ball_number")


class TeamListView(generics.ListAPIView):
    serializer_class = TeamSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Team.objects.filter(is_visible=True).select_related("tournament")
        tournament_id = self.request.query_params.get("tournament")
        if tournament_id:
            qs = qs.filter(tournament_id=tournament_id)
        return qs


class TeamDetailView(generics.RetrieveAPIView):
    queryset = Team.objects.filter(is_visible=True)
    serializer_class = TeamSerializer
    permission_classes = [AllowAny]


class PlayerListView(generics.ListAPIView):
    serializer_class = PlayerSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Player.objects.all()
        team_id = self.request.query_params.get("team")
        tournament_id = self.request.query_params.get("tournament")
        if team_id:
            qs = qs.filter(team_id=team_id)
        if tournament_id:
            qs = qs.filter(tournament_id=tournament_id)
        return qs


class PlayerDetailView(generics.RetrieveAPIView):
    queryset = Player.objects.select_related("team", "tournament")
    serializer_class = PlayerSerializer
    permission_classes = [AllowAny]


class PlayerTournamentStatsView(generics.ListAPIView):
    serializer_class = PlayerTournamentStatsSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        from .models import PlayerTournamentStats
        player_id = self.kwargs.get("pk")
        return PlayerTournamentStats.objects.filter(
            player_id=player_id
        ).select_related("player", "team", "tournament")


class PublicTeamRegistrationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PublicTeamRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        tournament = get_object_or_404(Tournament, pk=data["tournament"])

        team = Team.objects.create(
            tournament=tournament,
            name=data["name"],
            short_name=data.get("short_name", ""),
            home_city=data.get("home_city", ""),
            jersey_color=data.get("jersey_color", ""),
            contact_name=data.get("contact_name", ""),
            contact_email=data.get("contact_email", ""),
            contact_phone=data.get("contact_phone", ""),
            registration_status="pending",
            is_visible=False,
        )

        player_count = 0
        for p_data in data.get("players", []):
            Player.objects.create(
                team=team,
                tournament=tournament,
                name=p_data["name"],
                role=p_data.get("role", "batsman"),
                jersey_number=p_data.get("jersey_number"),
                batting_style=p_data.get("batting_style", "right_hand"),
                bowling_style=p_data.get("bowling_style", "none"),
            )
            player_count += 1

        return Response(
            {
                "team_id": str(team.id),
                "team_name": team.name,
                "player_count": player_count,
                "message": "Registration submitted. We will review and contact you shortly.",
            },
            status=status.HTTP_201_CREATED,
        )


class TournamentLeaderboardView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        tournament = get_object_or_404(Tournament, pk=pk)

        top_batsmen = (
            BattingScorecard.objects.filter(
                match__tournament=tournament,
                match__status="completed",
                did_not_bat=False,
            )
            .values("player__id", "player__name", "team__name", "team__short_name", "team__logo_url")
            .annotate(
                runs=Sum("runs"),
                innings=Count("id"),
                balls=Sum("balls_faced"),
                highest=Max("runs"),
                fours=Sum("fours"),
                sixes=Sum("sixes"),
            )
            .order_by("-runs")[:10]
        )

        top_bowlers = (
            BowlingScorecard.objects.filter(
                match__tournament=tournament,
                match__status="completed",
            )
            .values("player__id", "player__name", "team__name", "team__short_name", "team__logo_url")
            .annotate(
                wickets=Sum("wickets"),
                innings=Count("id"),
                balls=Sum("balls_bowled"),
                runs=Sum("runs_given"),
            )
            .order_by("-wickets", "runs")[:10]
        )

        batsmen_data = []
        for b in top_batsmen:
            sr = round(b["runs"] / b["balls"] * 100, 2) if b["balls"] else 0.0
            batsmen_data.append({
                "player_id": str(b["player__id"]),
                "player_name": b["player__name"],
                "team_name": b["team__name"],
                "team_short": b["team__short_name"],
                "team_logo": b["team__logo_url"],
                "runs": b["runs"],
                "innings": b["innings"],
                "highest": b["highest"],
                "balls": b["balls"],
                "fours": b["fours"],
                "sixes": b["sixes"],
                "strike_rate": sr,
            })

        bowlers_data = []
        for b in top_bowlers:
            eco = round(b["runs"] / (b["balls"] / 6), 2) if b["balls"] else 0.0
            avg = round(b["runs"] / b["wickets"], 2) if b["wickets"] else None
            bowlers_data.append({
                "player_id": str(b["player__id"]),
                "player_name": b["player__name"],
                "team_name": b["team__name"],
                "team_short": b["team__short_name"],
                "team_logo": b["team__logo_url"],
                "wickets": b["wickets"],
                "innings": b["innings"],
                "overs": f"{b['balls'] // 6}.{b['balls'] % 6}",
                "runs": b["runs"],
                "economy": eco,
                "average": avg,
            })

        return Response({"top_batsmen": batsmen_data, "top_bowlers": bowlers_data})


# ── Admin ViewSet ─────────────────────────────────────────────────────────────

class MatchAdminViewSet(ViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def list(self, request):
        qs = Match.objects.select_related("team1", "team2", "tournament")
        tournament_id = request.query_params.get("tournament")
        match_status = request.query_params.get("status")
        if tournament_id:
            qs = qs.filter(tournament_id=tournament_id)
        if match_status:
            qs = qs.filter(status=match_status)
        return Response(MatchSerializer(qs, many=True).data)

    def retrieve(self, request, pk=None):
        match = get_object_or_404(Match, pk=pk)
        return Response(LiveScoreSerializer(match).data)

    def create(self, request):
        serializer = MatchWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        match = serializer.save()
        return Response(MatchSerializer(match).data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        match = get_object_or_404(Match, pk=pk)
        serializer = MatchWriteSerializer(match, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        match = serializer.save()
        return Response(MatchSerializer(match).data)

    def partial_update(self, request, pk=None):
        return self.update(request, pk=pk)

    @action(detail=True, methods=["post"], url_path="toss")
    def record_toss(self, request, pk=None):
        match = get_object_or_404(Match, pk=pk)
        serializer = TossSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        toss_winner = get_object_or_404(Team, pk=data["toss_winner_id"])
        match.toss_winner = toss_winner
        match.toss_decision = data["toss_decision"]

        if data["toss_decision"] == "bat":
            match.batting_team = toss_winner
            match.bowling_team = match.team2 if toss_winner == match.team1 else match.team1
            match.innings1_team = toss_winner
        else:
            match.bowling_team = toss_winner
            match.batting_team = match.team2 if toss_winner == match.team1 else match.team1
            match.innings1_team = match.batting_team

        match.status = "toss_done"
        match.save()
        return Response(MatchSerializer(match).data)

    @action(detail=True, methods=["post"], url_path="start-innings")
    def start_innings(self, request, pk=None):
        match = get_object_or_404(Match, pk=pk)
        serializer = StartInningsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        match.current_batsman1 = get_object_or_404(Player, pk=data["opener1_id"])
        match.current_batsman2 = get_object_or_404(Player, pk=data["opener2_id"])
        match.current_bowler = get_object_or_404(Player, pk=data["bowler_id"])

        if match.current_innings == 1:
            match.status = "innings1"
        else:
            match.status = "innings2"
        match.save()
        return Response(LiveScoreSerializer(match).data)

    @action(detail=True, methods=["post"], url_path="ball")
    def submit_ball(self, request, pk=None):
        match = get_object_or_404(Match, pk=pk)
        if match.status not in ("innings1", "innings2"):
            return Response(
                {"detail": "Match is not in an active innings."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = BallEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service = BallService(match)
        service.process_ball(serializer.validated_data)
        match.refresh_from_db()
        return Response(LiveScoreSerializer(match).data)

    @action(detail=True, methods=["post"], url_path="set-batsman")
    def set_batsman(self, request, pk=None):
        match = get_object_or_404(Match, pk=pk)
        serializer = SetBatsmanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        player = get_object_or_404(Player, pk=serializer.validated_data["player_id"])
        slot = serializer.validated_data["slot"]
        if slot == "batsman1":
            match.current_batsman1 = player
            match.striker_slot = 0  # new batsman enters on strike
        else:
            match.current_batsman2 = player
        match.save()
        self._broadcast(match)
        return Response(LiveScoreSerializer(match).data)

    # ── helpers ──────────────────────────────────────────────────────────────

    @staticmethod
    def _broadcast(match):
        payload = dict(LiveScoreSerializer(match).data)
        try:
            async_to_sync(get_channel_layer().group_send)(
                f"match_{match.pk}",
                {"type": "score_update", "data": payload, "is_wicket": False, "end_event": None},
            )
        except Exception:
            pass  # channel layer not configured — ignore

    # ── actions ──────────────────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="set-striker")
    def set_striker(self, request, pk=None):
        match = get_object_or_404(Match, pk=pk)
        player_id = request.data.get("player_id")
        if not player_id:
            return Response({"detail": "player_id required"}, status=status.HTTP_400_BAD_REQUEST)
        if match.current_batsman1 and str(match.current_batsman1.id) == str(player_id):
            match.striker_slot = 0
        elif match.current_batsman2 and str(match.current_batsman2.id) == str(player_id):
            match.striker_slot = 1
        match.save()
        payload = LiveScoreSerializer(match).data
        self._broadcast(match)
        return Response(payload)

    @action(detail=True, methods=["post"], url_path="set-bowler")
    def set_bowler(self, request, pk=None):
        match = get_object_or_404(Match, pk=pk)
        serializer = SetBowlerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        match.current_bowler = get_object_or_404(Player, pk=serializer.validated_data["player_id"])
        match.save()
        self._broadcast(match)
        return Response(LiveScoreSerializer(match).data)

    @action(detail=True, methods=["post"], url_path="switch-innings")
    def switch_innings(self, request, pk=None):
        match = get_object_or_404(Match, pk=pk)
        if match.current_innings != 1:
            return Response({"detail": "Innings 2 already started."}, status=status.HTTP_400_BAD_REQUEST)

        old_batting = match.batting_team
        old_bowling = match.bowling_team

        match.innings2_team = old_bowling
        match.batting_team = old_bowling
        match.bowling_team = old_batting
        match.current_innings = 2
        match.current_over = 0
        match.current_ball = 0
        match.current_batsman1 = None
        match.current_batsman2 = None
        match.current_bowler = None
        match.required_runs = match.innings1_score + 1
        match.required_balls = match.total_overs * 6
        match.status = "toss_done"
        match.save()
        return Response(LiveScoreSerializer(match).data)

    @action(detail=True, methods=["post"], url_path="complete")
    def complete_match(self, request, pk=None):
        match = get_object_or_404(Match, pk=pk)
        winner_id = request.data.get("winner_id")
        result_text = request.data.get("result_text", "")
        mom_id = request.data.get("man_of_match_id")

        match.status = "completed"
        if winner_id:
            match.winner = get_object_or_404(Team, pk=winner_id)
        if result_text:
            match.result_text = result_text
        if mom_id:
            match.man_of_match = get_object_or_404(Player, pk=mom_id)
        match.save()
        return Response(MatchSerializer(match).data)

    @action(detail=True, methods=["get", "post", "delete"], url_path="playing-xi")
    def playing_xi(self, request, pk=None):
        match = get_object_or_404(Match, pk=pk)

        if request.method == "GET":
            entries = MatchPlayingXI.objects.filter(match=match).select_related(
                "player", "team"
            ).order_by("team_id", "batting_order")
            result = {}
            for e in entries:
                tid = str(e.team_id)
                if tid not in result:
                    result[tid] = {"team_id": tid, "players": []}
                result[tid]["players"].append(MatchPlayingXIReadSerializer(e).data)
            return Response(list(result.values()))

        if request.method == "POST":
            serializer = PlayingXISetSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            data = serializer.validated_data
            team = get_object_or_404(Team, pk=data["team_id"])
            MatchPlayingXI.objects.filter(match=match, team=team).delete()
            created = []
            for i, p_data in enumerate(data["players"], start=1):
                player = get_object_or_404(Player, pk=p_data["player_id"])
                entry = MatchPlayingXI.objects.create(
                    match=match,
                    team=team,
                    player=player,
                    batting_order=p_data.get("batting_order") or i,
                    is_impact_player=p_data.get("is_impact_player", False),
                )
                created.append(entry)
            return Response(MatchPlayingXIReadSerializer(created, many=True).data,
                            status=status.HTTP_201_CREATED)

        # DELETE — clear entire Playing XI for match
        team_id = request.data.get("team_id")
        if team_id:
            MatchPlayingXI.objects.filter(match=match, team_id=team_id).delete()
        else:
            MatchPlayingXI.objects.filter(match=match).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Admin CRUD for Tournaments, Teams, Players ────────────────────────────────

class AdminTournamentListCreateView(generics.ListCreateAPIView):
    queryset = Tournament.objects.all()
    serializer_class = TournamentSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]


class AdminTournamentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Tournament.objects.all()
    serializer_class = TournamentSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]


class AdminTeamListCreateView(generics.ListCreateAPIView):
    queryset = Team.objects.select_related("tournament")
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        qs = super().get_queryset()
        tournament_id = self.request.query_params.get("tournament")
        if tournament_id:
            qs = qs.filter(tournament_id=tournament_id)
        return qs


class AdminTeamDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]


class AdminTeamApproveView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        team = get_object_or_404(Team, pk=pk)
        action_type = request.data.get("action")
        if action_type == "approve":
            team.approve(request.user)
        elif action_type == "reject":
            team.reject()
        else:
            return Response({"detail": "action must be 'approve' or 'reject'."}, status=400)
        return Response(TeamSerializer(team).data)


class AdminPlayerListCreateView(generics.ListCreateAPIView):
    queryset = Player.objects.select_related("team", "tournament")
    serializer_class = PlayerSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        qs = super().get_queryset()
        team_id = self.request.query_params.get("team")
        tournament_id = self.request.query_params.get("tournament")
        if team_id:
            qs = qs.filter(team_id=team_id)
        if tournament_id:
            qs = qs.filter(tournament_id=tournament_id)
        return qs


class AdminPlayerDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Player.objects.all()
    serializer_class = PlayerSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]


class AdminTeamSetDesignationsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        team = get_object_or_404(Team, pk=pk)
        serializer = SetDesignationsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if "captain_id" in data:
            team.captain = get_object_or_404(Player, pk=data["captain_id"]) if data["captain_id"] else None
        if "vice_captain_id" in data:
            team.vice_captain = get_object_or_404(Player, pk=data["vice_captain_id"]) if data["vice_captain_id"] else None
        if "wicket_keeper_id" in data:
            team.wicket_keeper = get_object_or_404(Player, pk=data["wicket_keeper_id"]) if data["wicket_keeper_id"] else None

        update_fields = []
        if "captain_id" in data:
            update_fields.append("captain")
        if "vice_captain_id" in data:
            update_fields.append("vice_captain")
        if "wicket_keeper_id" in data:
            update_fields.append("wicket_keeper")
        if update_fields:
            team.save(update_fields=update_fields)
        return Response(TeamSerializer(team).data)
