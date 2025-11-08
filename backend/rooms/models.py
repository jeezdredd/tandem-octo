import uuid

from django.db import models


class Video(models.Model):
    SOURCE_TYPES = [
        ("youtube", "YouTube"),
        ("vimeo", "Vimeo"),
        ("direct", "Direct Link"),
        ("screen_share", "Screen Share"),
        ("uploaded", "Uploaded File"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True, help_text="Short description")
    year = models.IntegerField(blank=True, null=True, help_text="Release year")
    rating = models.DecimalField(
        max_digits=3, decimal_places=1, blank=True, null=True, help_text="Rating (0.0-10.0)"
    )
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPES, default="direct")
    source_url = models.URLField(max_length=500, blank=True, null=True)
    thumbnail = models.URLField(max_length=500, blank=True, null=True)
    duration = models.IntegerField(blank=True, null=True, help_text="Duration in seconds")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Video"
        verbose_name_plural = "Videos"


class Room(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    video = models.ForeignKey(
        Video, on_delete=models.SET_NULL, blank=True, null=True, related_name="rooms"
    )
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
