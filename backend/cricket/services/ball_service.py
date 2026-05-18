from __future__ import annotations

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction

from cricket.models import (
    Match, BattingScorecard, BowlingScorecard, BallCommentary, InningsExtras,
    PlayerTournamentStats,
)


class BallService:
    """Core gameplay engine. All state mutations go through process_ball()."""

    def __init__(self, match: Match):
        self.match = match
        self.channel_layer = get_channel_layer()

    @transaction.atomic
    def process_ball(self, payload: dict) -> BallCommentary:
        match = Match.objects.select_for_update().get(pk=self.match.pk)

        runs_scored = payload.get("runs_scored", 0)
        extra_type = payload.get("extra_type", "none")
        extras = payload.get("extras", 0)
        is_wicket = payload.get("is_wicket", False)
        wicket_type = payload.get("wicket_type", "")
        dismissed_player_id = payload.get("dismissed_player_id")
        fielder_id = payload.get("fielder_id")
        batsman_id = payload.get("batsman_id") or (
            match.current_batsman1_id if match.current_batsman1_id else None
        )
        bowler_id = payload.get("bowler_id") or match.current_bowler_id

        is_legal = extra_type not in ("wide", "no_ball")
        ball_number = match.current_ball + 1 if is_legal else match.current_ball

        # -- Batting scorecard (striker) ---------------------------------------
        batting_card, _ = BattingScorecard.objects.select_for_update().get_or_create(
            match=match,
            innings_number=match.current_innings,
            player_id=batsman_id,
            defaults={"team": match.batting_team, "batting_position": self._next_batting_position(match)},
        )
        if extra_type not in ("wide",):
            batting_card.balls_faced += 1
        batting_card.runs += runs_scored
        if runs_scored == 4:
            batting_card.fours += 1
        if runs_scored == 6:
            batting_card.sixes += 1
        if is_wicket and str(dismissed_player_id) == str(batsman_id):
            batting_card.is_out = True
            batting_card.wicket_type = wicket_type
            batting_card.out_reason = self._build_out_reason(payload, match)
            batting_card.dismissed_by_bowler_id = bowler_id if wicket_type != "run_out" else None
            batting_card.fielder_id = fielder_id
        batting_card.save()

        # -- Non-striker dismissal (e.g. run out on non-striker) ---------------
        if is_wicket and dismissed_player_id and str(dismissed_player_id) != str(batsman_id):
            dismissed_card, _ = BattingScorecard.objects.select_for_update().get_or_create(
                match=match,
                innings_number=match.current_innings,
                player_id=dismissed_player_id,
                defaults={"team": match.batting_team, "batting_position": self._next_batting_position(match)},
            )
            dismissed_card.is_out = True
            dismissed_card.wicket_type = wicket_type
            dismissed_card.out_reason = self._build_out_reason(payload, match)
            dismissed_card.fielder_id = fielder_id
            dismissed_card.save()

        # -- Bowling scorecard -------------------------------------------------
        bowling_card, _ = BowlingScorecard.objects.select_for_update().get_or_create(
            match=match,
            innings_number=match.current_innings,
            player_id=bowler_id,
            defaults={"team": match.bowling_team},
        )
        if is_legal:
            bowling_card.balls_bowled += 1
        elif extra_type == "wide":
            bowling_card.wides += 1
        elif extra_type == "no_ball":
            bowling_card.no_balls += 1
        bowling_card.runs_given += runs_scored + (extras if extra_type in ("wide", "no_ball") else 0)
        if is_wicket and wicket_type != "run_out":
            bowling_card.wickets += 1
        bowling_card.save()

        # -- Fielding stats ---------------------------------------------------
        if is_wicket and fielder_id:
            self._update_fielding_stats(match, fielder_id, wicket_type)

        # -- Extras record -----------------------------------------------------
        extras_record, _ = InningsExtras.objects.select_for_update().get_or_create(
            match=match, innings_number=match.current_innings
        )
        if extra_type == "wide":
            extras_record.wides += 1 + (extras - 1 if extras > 1 else 0)
        elif extra_type == "no_ball":
            extras_record.no_balls += 1
        elif extra_type == "leg_bye":
            extras_record.leg_byes += extras
        elif extra_type == "bye":
            extras_record.byes += extras
        extras_record.save()

        # -- Match score -------------------------------------------------------
        total_runs = runs_scored + (extras if extra_type in ("wide", "no_ball", "leg_bye", "bye") else 0)
        self._update_match_score(match, total_runs, is_wicket, is_legal)

        # -- Commentary --------------------------------------------------------
        commentary = BallCommentary.objects.create(
            match=match,
            innings_number=match.current_innings,
            over_number=match.current_over,
            ball_number=ball_number,
            batsman_id=batsman_id,
            bowler_id=bowler_id,
            runs_scored=runs_scored,
            extras=extras,
            extra_type=extra_type,
            is_wicket=is_wicket,
            wicket_type=wicket_type,
            dismissed_player_id=dismissed_player_id,
            fielder_id=fielder_id,
            is_four=(runs_scored == 4),
            is_six=(runs_scored == 6),
            commentary_text=self._generate_commentary(payload, match),
            total_score_after=self._current_score(match),
            total_wickets_after=self._current_wickets(match),
        )

        # -- Check innings end -------------------------------------------------
        end_event = self._check_innings_end(match)

        # -- Advance over/ball if legal ----------------------------------------
        if is_legal:
            if match.current_ball >= 5:
                match.current_over += 1
                match.current_ball = 0
            else:
                match.current_ball += 1
        match.save()

        # Serialize inside the transaction for a consistent snapshot, then
        # broadcast AFTER commit so the channel layer fires on the correct
        # event loop (fixes InMemoryChannelLayer silent-drop in dev).
        from cricket.serializers import LiveScoreSerializer
        broadcast_payload = dict(LiveScoreSerializer(match).data)
        group = f"match_{match.pk}"
        is_wicket_flag = commentary.is_wicket

        def _send():
            async_to_sync(self.channel_layer.group_send)(
                group,
                {
                    "type": "score_update",
                    "data": broadcast_payload,
                    "is_wicket": is_wicket_flag,
                    "end_event": end_event,
                },
            )

        transaction.on_commit(_send)
        return commentary

    # --------------------------------------------------------------------------
    # Private helpers
    # --------------------------------------------------------------------------

    def _current_score(self, match: Match) -> int:
        if match.current_innings == 1:
            return match.innings1_score
        return match.innings2_score

    def _current_wickets(self, match: Match) -> int:
        if match.current_innings == 1:
            return match.innings1_wickets
        return match.innings2_wickets

    def _update_match_score(self, match: Match, total_runs: int, is_wicket: bool, is_legal: bool):
        if match.current_innings == 1:
            match.innings1_score += total_runs
            if is_wicket:
                match.innings1_wickets += 1
            if is_legal:
                match.innings1_overs = self._overs_decimal(match.current_over, match.current_ball + 1)
        else:
            match.innings2_score += total_runs
            if is_wicket:
                match.innings2_wickets += 1
            if is_legal:
                match.innings2_overs = self._overs_decimal(match.current_over, match.current_ball + 1)
            # Update required runs/balls
            if match.innings1_score is not None:
                target = match.innings1_score + 1
                remaining = target - match.innings2_score
                legal_balls_used = match.current_over * 6 + (match.current_ball + 1 if is_legal else match.current_ball)
                total_balls = match.total_overs * 6
                match.required_runs = max(0, remaining)
                match.required_balls = max(0, total_balls - legal_balls_used)

    def _check_innings_end(self, match: Match) -> str | None:
        innings = match.current_innings
        score = self._current_score(match)
        wickets = self._current_wickets(match)
        legal_balls = match.current_over * 6 + match.current_ball
        total_balls = match.total_overs * 6

        all_out = wickets >= 10
        overs_done = legal_balls >= total_balls
        chased = innings == 2 and match.innings1_score is not None and score > match.innings1_score

        if not (all_out or overs_done or chased):
            return None

        if innings == 1:
            match.status = "innings2"
            match.current_innings = 2
            match.current_over = 0
            match.current_ball = 0
            match.innings2_team = match.team2 if match.innings1_team == match.team1 else match.team1
            match.batting_team, match.bowling_team = match.bowling_team, match.batting_team
            match.current_batsman1 = None
            match.current_batsman2 = None
            match.current_bowler = None
            target = match.innings1_score + 1
            match.required_runs = target
            match.required_balls = match.total_overs * 6
            match.save()
            return "innings1_end"
        else:
            self._complete_match(match, chased)
            return "match_end"

    def _complete_match(self, match: Match, chased: bool):
        match.status = "completed"
        if chased:
            wickets_remaining = 10 - self._current_wickets(match)
            match.winner = match.batting_team
            match.result_text = f"{match.batting_team} won by {wickets_remaining} wicket{'s' if wickets_remaining != 1 else ''}"
        else:
            diff = match.innings1_score - match.innings2_score
            if diff > 0:
                match.winner = match.innings1_team
                match.result_text = f"{match.innings1_team} won by {diff} run{'s' if diff != 1 else ''}"
            elif diff < 0:
                match.winner = match.innings2_team
                wickets_remaining = 10 - self._current_wickets(match)
                match.result_text = f"{match.innings2_team} won by {wickets_remaining} wicket{'s' if wickets_remaining != 1 else ''}"
            else:
                match.winner = None
                match.result_text = "Match tied"
        match.save()

    @staticmethod
    def _update_fielding_stats(match: Match, fielder_id, wicket_type: str):
        try:
            from cricket.models import Player
            fielder = Player.objects.select_related("team").get(pk=fielder_id)
            stats, _ = PlayerTournamentStats.objects.get_or_create(
                player=fielder,
                tournament=match.tournament,
                defaults={"team": fielder.team},
            )
            if wicket_type == "stumped":
                stats.stumpings += 1
            elif wicket_type == "run_out":
                stats.run_outs += 1
            else:
                stats.catches += 1
            stats.save(update_fields=["stumpings", "run_outs", "catches"])
        except Exception:
            pass  # don't let stat tracking break match scoring

    @staticmethod
    def _overs_decimal(over: int, ball: int) -> float:
        legal_in_over = min(ball, 6)
        return float(f"{over}.{legal_in_over}")

    @staticmethod
    def _next_batting_position(match: Match) -> int:
        return BattingScorecard.objects.filter(
            match=match, innings_number=match.current_innings
        ).count() + 1

    @staticmethod
    def _build_out_reason(payload: dict, match: Match) -> str:
        wicket_type = payload.get("wicket_type", "")
        fielder_id = payload.get("fielder_id")
        bowler_id = payload.get("bowler_id") or match.current_bowler_id

        try:
            from cricket.models import Player
            bowler_name = Player.objects.get(pk=bowler_id).name if bowler_id else ""
            fielder_name = Player.objects.get(pk=fielder_id).name if fielder_id else ""
        except Exception:
            bowler_name = ""
            fielder_name = ""

        if wicket_type == "bowled":
            return f"b {bowler_name}"
        if wicket_type == "caught":
            return f"c {fielder_name} b {bowler_name}"
        if wicket_type == "lbw":
            return f"lbw b {bowler_name}"
        if wicket_type == "stumped":
            return f"st {fielder_name} b {bowler_name}"
        if wicket_type == "run_out":
            return f"run out ({fielder_name})" if fielder_name else "run out"
        if wicket_type == "hit_wicket":
            return f"hit wicket b {bowler_name}"
        return wicket_type

    @staticmethod
    def _generate_commentary(payload: dict, match: Match) -> str:
        runs = payload.get("runs_scored", 0)
        extra_type = payload.get("extra_type", "none")
        is_wicket = payload.get("is_wicket", False)
        is_four = runs == 4
        is_six = runs == 6

        if is_wicket:
            wt = payload.get("wicket_type", "")
            return f"WICKET! {wt.upper().replace('_', ' ')}!"
        if is_six:
            return "SIX! Huge shot over the boundary!"
        if is_four:
            return "FOUR! That races away to the boundary!"
        if extra_type == "wide":
            return "Wide ball."
        if extra_type == "no_ball":
            return f"No ball! {runs} off the bat."
        if runs == 0:
            return "Dot ball."
        return f"{runs} run{'s' if runs != 1 else ''} taken."
