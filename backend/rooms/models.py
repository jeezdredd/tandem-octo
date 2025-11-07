from django.db import models
import uuid

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
        ordering = ['-created_at']
