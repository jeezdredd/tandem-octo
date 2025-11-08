from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response

from rooms.models import Room, RoomState, Video
from rooms.serializers import (
    RoomSerializer,
    RoomCreateSerializer,
    RoomStateSerializer,
    VideoSerializer,
)


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return RoomCreateSerializer
        return RoomSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        room = serializer.save()

        response_serializer = RoomSerializer(room)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'patch'], url_path='state')
    def room_state(self, request, pk=None):
        room = self.get_object()

        if request.method == 'GET':
            serializer = RoomStateSerializer(room.state)
            return Response(serializer.data)

        elif request.method == 'PATCH':
            serializer = RoomStateSerializer(room.state, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)


class VideoViewSet(viewsets.ModelViewSet):
    queryset = Video.objects.all()
    serializer_class = VideoSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "year", "rating", "title"]
    ordering = ["-created_at"]
