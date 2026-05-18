from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r"ws/match/(?P<match_id>[^/]+)/$", consumers.MatchConsumer.as_asgi()),
]
