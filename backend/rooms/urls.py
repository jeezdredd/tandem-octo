from django.urls import path, include
from rest_framework.routers import DefaultRouter

from rooms.views import RoomViewSet, VideoViewSet

router = DefaultRouter()
router.register(r'rooms', RoomViewSet, basename='room')
router.register(r'videos', VideoViewSet, basename='video')

urlpatterns = [
    path('', include(router.urls)),
]
