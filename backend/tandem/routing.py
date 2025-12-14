from django.urls import re_path

from rooms.consumers import RoomConsumer

websocket_urlpatterns = [
    re_path(r"ws/rooms/(?P<room_id>[^/]+)/$", RoomConsumer.as_asgi()),
    # Support for paths without 'ws/' prefix (Railway proxy may strip it)
    re_path(r"rooms/(?P<room_id>[^/]+)/$", RoomConsumer.as_asgi()),
]
