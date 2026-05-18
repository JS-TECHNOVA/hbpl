from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path("ws/match/<int:match_id>/", consumers.MatchConsumer.as_asgi()),
    path("ws/events/", consumers.EventConsumer.as_asgi()),
]
