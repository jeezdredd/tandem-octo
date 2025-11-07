import uuid

from django.db import models


class Room(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    video_url = models.URLField(max_length=500, blank=True, null=True)
    password = models.CharField(max_length=128, blank=True, null=True)
    host_control = models.BooleanField(default=False)
    host_username = models.CharField(max_length=100)

    def __str__(self):
        return f"Room {self.id}"

    class Meta:
        ordering = ["-created_at"]


class RoomState(models.Model):
    room = models.OneToOneField(Room, on_delete=models.CASCADE, related_name="state")
    current_time = models.FloatField(default=0.0)
    is_playing = models.BooleanField(default=False)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"State for Room {self.room.id}"

    class Meta:
        verbose_name = "Room State"
        verbose_name_plural = "Room States"
