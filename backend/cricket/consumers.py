import json
from django.core.serializers.json import DjangoJSONEncoder
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async


class MatchConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.match_id = self.scope["url_route"]["kwargs"]["match_id"]
        self.group_name = f"match_{self.match_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send_current_state()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        pass

    async def score_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "score_update",
            "data": event["data"],
            "is_wicket": event.get("is_wicket", False),
            "end_event": event.get("end_event"),
        }, cls=DjangoJSONEncoder))

    async def send_current_state(self):
        data = await self._get_live_data()
        if data:
            await self.send(text_data=json.dumps({"type": "initial_state", "data": data}, cls=DjangoJSONEncoder))

    @sync_to_async
    def _get_live_data(self):
        from cricket.models import Match
        from cricket.serializers import LiveScoreSerializer
        try:
            match = Match.objects.get(pk=self.match_id)
            return LiveScoreSerializer(match).data
        except Match.DoesNotExist:
            return None
