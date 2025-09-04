# audiobooks/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AudiobookViewSet

router = DefaultRouter()
router.register(r"audiobooks", AudiobookViewSet, basename="audiobook")

urlpatterns = [
    path('', include(router.urls)),
]