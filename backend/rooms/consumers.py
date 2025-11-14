import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

from rooms.models import Room, RoomState

logger = logging.getLogger(__name__)

room_users = {}


class RoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        self.room_group_name = f"room_{self.room_id}"
        self.user_id = self.scope.get("client", ["unknown"])[0]
        self.username = None

        logger.info(f"WebSocket CONNECT: room={self.room_id}, channel={self.channel_name}")

        if not await self.room_exists():
            logger.warning(f"Room {self.room_id} does not exist")
            await self.close()
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

        await self.accept()

        logger.info(f"WebSocket ACCEPTED: room={self.room_id}")

        current_state = await self.get_room_state()
        room_data = await self.get_room_data()
        await self.send(
            text_data=json.dumps(
                {
                    "type": "room_state",
                    "current_time": current_state["current_time"],
                    "is_playing": current_state["is_playing"],
                    "video_url": room_data.get("video_url", ""),
                }
            )
        )

    async def disconnect(self, close_code):
        if self.username and self.room_id in room_users:
            if self.channel_name in room_users[self.room_id]:
                del room_users[self.room_id][self.channel_name]
                await self.broadcast_user_list()

        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        logger.info(f"WebSocket RECEIVE: {text_data[:100]}")
        data = json.loads(text_data)
        event_type = data.get("type")
        logger.info(f"Event type: {event_type}, data: {data}")

        if event_type == "join":
            self.username = data.get("username", "Guest")
            if self.room_id not in room_users:
                room_users[self.room_id] = {}
            room_users[self.room_id][self.channel_name] = self.username
            logger.info(f"User {self.username} joined room {self.room_id}")
            await self.broadcast_user_list()

        elif event_type == "play":
            await self.update_room_state(data.get("current_time"), True)
            logger.info(f"Broadcasting PLAY to room {self.room_group_name}")
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "video_event",
                    "event": "play",
                    "current_time": data.get("current_time"),
                    "sender_channel": self.channel_name,
                },
            )

        elif event_type == "pause":
            await self.update_room_state(data.get("current_time"), False)
            logger.info(f"Broadcasting PAUSE to room {self.room_group_name}")
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "video_event",
                    "event": "pause",
                    "current_time": data.get("current_time"),
                    "sender_channel": self.channel_name,
                },
            )

        elif event_type == "seek":
            await self.update_room_state(data.get("current_time"), data.get("is_playing", False))
            logger.info(f"Broadcasting SEEK to room {self.room_group_name}")
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "video_event",
                    "event": "seek",
                    "current_time": data.get("current_time"),
                    "sender_channel": self.channel_name,
                },
            )

        elif event_type == "video_change":
            video_url = data.get("video_url", "")
            await self.update_room_video(video_url)
            logger.info(f"Broadcasting VIDEO_CHANGE to room {self.room_group_name}")
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "video_change_event",
                    "video_url": video_url,
                    "sender_channel": self.channel_name,
                },
            )

    async def video_event(self, event):
        logger.info(f"video_event called: event={event['event']}, sender={event.get('sender_channel')}, self={self.channel_name}")
        if event.get("sender_channel") != self.channel_name:
            logger.info(f"Sending {event['event']} event to client")
            await self.send(
                text_data=json.dumps(
                    {
                        "type": event["event"],
                        "current_time": event["current_time"],
                    }
                )
            )
        else:
            logger.info(f"Skipping own event for channel {self.channel_name}")

    @database_sync_to_async
    def room_exists(self):
        return Room.objects.filter(id=self.room_id).exists()

    @database_sync_to_async
    def get_room_state(self):
        room = Room.objects.get(id=self.room_id)
        state = room.state
        return {
            "current_time": float(state.current_time),
            "is_playing": state.is_playing,
        }

    @database_sync_to_async
    def update_room_state(self, current_time, is_playing):
        room = Room.objects.get(id=self.room_id)
        state = room.state
        state.current_time = current_time
        state.is_playing = is_playing
        state.save()

    async def broadcast_user_list(self):
        if self.room_id in room_users:
            users = list(room_users[self.room_id].values())
        else:
            users = []

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "user_list_event",
                "users": users,
            }
        )

    async def user_list_event(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "user_list",
                    "users": event["users"],
                }
            )
        )

    async def video_change_event(self, event):
        logger.info(f"video_change_event called: sender={event.get('sender_channel')}, self={self.channel_name}")
        if event.get("sender_channel") != self.channel_name:
            logger.info(f"Sending video_changed event to client")
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "video_changed",
                        "video_url": event["video_url"],
                    }
                )
            )
        else:
            logger.info(f"Skipping own video_change event for channel {self.channel_name}")

    @database_sync_to_async
    def get_room_data(self):
        room = Room.objects.get(id=self.room_id)
        return {
            "video_url": room.video_url or "",
        }

    @database_sync_to_async
    def update_room_video(self, video_url):
        room = Room.objects.get(id=self.room_id)
        room.video_url = video_url
        room.save()
