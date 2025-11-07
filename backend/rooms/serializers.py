from rest_framework import serializers

from rooms.models import Room, RoomState


class RoomStateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomState
        fields = ["current_time", "is_playing", "last_updated"]
        read_only_fields = ["last_updated"]


class RoomSerializer(serializers.ModelSerializer):
    state = RoomStateSerializer(read_only=True)

    class Meta:
        model = Room
        fields = [
            "id",
            "created_at",
            "video_url",
            "password",
            "host_control",
            "host_username",
            "state",
        ]
        read_only_fields = ["id", "created_at"]
        extra_kwargs = {"password": {"write_only": True}}


class RoomCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ["video_url", "password", "host_control", "host_username"]

    def create(self, validated_data):
        room = Room.objects.create(**validated_data)
        RoomState.objects.create(room=room)
        return room
