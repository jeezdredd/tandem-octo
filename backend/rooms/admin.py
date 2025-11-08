from django.contrib import admin

from rooms.models import Room, RoomState, Video


class RoomStateInline(admin.StackedInline):
    model = RoomState
    can_delete = False
    fields = ["current_time", "is_playing", "last_updated"]
    readonly_fields = ["last_updated"]


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "host_username",
        "created_at",
        "host_control",
        "has_password",
        "get_state",
    ]
    list_filter = ["host_control", "created_at"]
    search_fields = ["id", "host_username", "video_url"]
    readonly_fields = ["id", "created_at"]
    fieldsets = [
        (
            "Room Information",
            {
                "fields": ["id", "created_at", "host_username"],
            },
        ),
        (
            "Video Settings",
            {
                "fields": ["video", "video_url"],
            },
        ),
        (
            "Access Control",
            {
                "fields": ["password", "host_control"],
            },
        ),
    ]
    inlines = [RoomStateInline]

    def has_password(self, obj):
        return bool(obj.password)

    has_password.boolean = True
    has_password.short_description = "Password Protected"

    def get_state(self, obj):
        if hasattr(obj, "state"):
            return f"Time: {obj.state.current_time}s | Playing: {obj.state.is_playing}"
        return "No state"

    get_state.short_description = "Current State"


@admin.register(RoomState)
class RoomStateAdmin(admin.ModelAdmin):
    list_display = ["room", "current_time", "is_playing", "last_updated"]
    list_filter = ["is_playing", "last_updated"]
    readonly_fields = ["last_updated"]
    fields = ["room", "current_time", "is_playing", "last_updated"]


@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ["title", "year", "rating", "source_type", "duration", "created_at"]
    list_filter = ["source_type", "year", "created_at"]
    search_fields = ["title", "description"]
    readonly_fields = ["id", "created_at"]
    fieldsets = [
        (
            "Video Information",
            {
                "fields": ["id", "title", "description", "year", "rating", "created_at"],
            },
        ),
        (
            "Source Settings",
            {
                "fields": ["source_type", "source_url", "thumbnail", "duration"],
            },
        ),
    ]
