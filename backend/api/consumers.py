import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class MatchConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.match_id = self.scope["url_route"]["kwargs"]["match_id"]
        self.group_name = f"match_{self.match_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        state = await self.get_initial_state()
        await self.send(text_data=json.dumps(state))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        pass  # Read-only; score updates come from REST views

    async def score_update(self, event):
        await self.send(text_data=json.dumps(event["data"]))

    @database_sync_to_async
    def get_initial_state(self):
        from .models import Match, Innings, BatsmanScore, BowlerScore
        try:
            match = Match.objects.get(pk=self.match_id)
            innings = (
                match.innings.filter(is_completed=False).first()
                or match.innings.order_by("-innings_number").first()
            )
            if not innings:
                return {
                    "type": "full_state",
                    "match_id": int(self.match_id),
                    "match_status": match.match_status,
                    "batting_team": match.team1,
                    "bowling_team": match.team2,
                    "total_runs": 0,
                    "wickets": 0,
                    "overs": "0.0",
                    "target": None,
                    "extras": 0,
                    "current_batsmen": [],
                    "current_bowler": None,
                    "last_ball": "",
                    "recent_balls": [],
                }

            current_batsmen = []
            for bs in BatsmanScore.objects.filter(
                innings=innings, is_batting=True
            ).select_related("batsman"):
                current_batsmen.append({
                    "id": bs.batsman.id,
                    "name": bs.batsman.name,
                    "runs": bs.runs,
                    "balls": bs.balls_faced,
                    "fours": bs.fours,
                    "sixes": bs.sixes,
                })

            current_bowler = None
            current_over = (
                innings.overs.filter(is_completed=False).select_related("bowler").first()
            )
            if current_over and current_over.bowler:
                bs = BowlerScore.objects.filter(
                    innings=innings, bowler=current_over.bowler
                ).first()
                current_bowler = {
                    "id": current_over.bowler.id,
                    "name": current_over.bowler.name,
                    "overs": bs.overs if bs else "0.0",
                    "runs": bs.runs if bs else 0,
                    "wickets": bs.wickets if bs else 0,
                }

            recent_balls = _balls_for_over(current_over)

            return {
                "type": "full_state",
                "match_id": int(self.match_id),
                "match_status": match.match_status,
                "innings_id": innings.id,
                "innings_number": innings.innings_number,
                "batting_team": innings.batting_team_name,
                "bowling_team": innings.bowling_team_name,
                "total_runs": innings.total_runs,
                "wickets": innings.wickets,
                "overs": str(innings.overs_completed),
                "target": innings.target,
                "extras": innings.extras,
                "current_batsmen": current_batsmen,
                "current_bowler": current_bowler,
                "last_ball": recent_balls[-1] if recent_balls else "",
                "recent_balls": recent_balls,
            }
        except Match.DoesNotExist:
            return {"type": "error", "message": "Match not found"}


class EventConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = "events"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        events = await self.get_events()
        await self.send(text_data=json.dumps({"type": "events_list", "events": events}))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def event_update(self, event):
        await self.send(text_data=json.dumps(event["data"]))

    @database_sync_to_async
    def get_events(self):
        from .models import Event
        result = []
        for e in Event.objects.filter(is_published=True).order_by("date")[:30]:
            result.append({
                "id": e.id,
                "title": e.title,
                "date": e.date.isoformat() if e.date else None,
                "location": e.location,
                "category": e.category,
            })
        return result


def _balls_for_over(over):
    if not over:
        return []
    balls = []
    for b in over.balls.order_by("ball_number"):
        if b.is_wicket:
            balls.append("W")
        elif b.is_extra and b.extra_type == "wide":
            balls.append("Wd")
        elif b.is_extra and b.extra_type == "no_ball":
            balls.append("Nb")
        elif b.is_six:
            balls.append("6")
        elif b.is_boundary:
            balls.append("4")
        elif b.runs_off_bat == 0 and not b.is_extra:
            balls.append("•")
        else:
            balls.append(str(b.runs_off_bat))
    return balls
