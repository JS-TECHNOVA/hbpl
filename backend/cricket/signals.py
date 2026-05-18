from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db.models import Sum, Count, Max


@receiver(post_save, sender="cricket.Match")
def aggregate_player_stats_on_complete(sender, instance, **kwargs):
    if instance.status != "completed":
        return
    _aggregate_tournament_stats(instance.tournament_id)


def _aggregate_tournament_stats(tournament_id):
    from .models import (
        BattingScorecard, BowlingScorecard, BallCommentary,
        Player, PlayerTournamentStats,
    )

    player_ids: set = set()
    player_ids.update(
        BattingScorecard.objects.filter(
            match__tournament_id=tournament_id,
            match__status="completed",
        ).values_list("player_id", flat=True)
    )
    player_ids.update(
        BowlingScorecard.objects.filter(
            match__tournament_id=tournament_id,
            match__status="completed",
        ).values_list("player_id", flat=True)
    )

    for player_id in player_ids:
        _aggregate_player(player_id, tournament_id)


def _aggregate_player(player_id, tournament_id):
    from .models import (
        BattingScorecard, BowlingScorecard, BallCommentary,
        Player, PlayerTournamentStats,
    )

    try:
        player = Player.objects.get(pk=player_id)
    except Player.DoesNotExist:
        return

    batting_qs = BattingScorecard.objects.filter(
        player_id=player_id,
        match__tournament_id=tournament_id,
        match__status="completed",
        did_not_bat=False,
    )
    batting_agg = batting_qs.aggregate(
        total_runs=Sum("runs"),
        total_balls=Sum("balls_faced"),
        total_fours=Sum("fours"),
        total_sixes=Sum("sixes"),
        highest=Max("runs"),
        innings=Count("id"),
    )
    not_outs = batting_qs.filter(is_out=False).count()
    fifties = batting_qs.filter(runs__gte=50, runs__lt=100).count()
    hundreds = batting_qs.filter(runs__gte=100).count()

    bowling_qs = BowlingScorecard.objects.filter(
        player_id=player_id,
        match__tournament_id=tournament_id,
        match__status="completed",
    )
    bowling_agg = bowling_qs.aggregate(
        total_balls=Sum("balls_bowled"),
        total_runs=Sum("runs_given"),
        total_wickets=Sum("wickets"),
        total_maidens=Sum("maidens"),
        innings=Count("id"),
    )
    best_bowling = bowling_qs.order_by("-wickets", "runs_given").first()

    catches = BallCommentary.objects.filter(
        match__tournament_id=tournament_id,
        match__status="completed",
        fielder_id=player_id,
        wicket_type__in=["caught", "stumped"],
    ).count()
    run_outs = BallCommentary.objects.filter(
        match__tournament_id=tournament_id,
        match__status="completed",
        fielder_id=player_id,
        wicket_type="run_out",
    ).count()

    matches_played = (
        BattingScorecard.objects.filter(
            player_id=player_id,
            match__tournament_id=tournament_id,
            match__status="completed",
        )
        .values("match")
        .distinct()
        .count()
    )

    PlayerTournamentStats.objects.update_or_create(
        player_id=player_id,
        tournament_id=tournament_id,
        defaults={
            "team": player.team,
            "matches_played": matches_played,
            "innings_batted": batting_agg["innings"] or 0,
            "not_outs": not_outs,
            "runs": batting_agg["total_runs"] or 0,
            "highest_score": batting_agg["highest"] or 0,
            "balls_faced": batting_agg["total_balls"] or 0,
            "fours": batting_agg["total_fours"] or 0,
            "sixes": batting_agg["total_sixes"] or 0,
            "fifties": fifties,
            "hundreds": hundreds,
            "innings_bowled": bowling_agg["innings"] or 0,
            "balls_bowled": bowling_agg["total_balls"] or 0,
            "runs_given": bowling_agg["total_runs"] or 0,
            "wickets": bowling_agg["total_wickets"] or 0,
            "best_wickets": best_bowling.wickets if best_bowling else 0,
            "best_runs": best_bowling.runs_given if best_bowling else None,
            "maidens": bowling_agg["total_maidens"] or 0,
            "catches": catches,
            "run_outs": run_outs,
            "stumpings": 0,
        },
    )
