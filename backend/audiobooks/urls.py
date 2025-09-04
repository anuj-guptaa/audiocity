# audiobooks/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
router.register(r"audiobooks", AudiobookViewSet, basename="audiobook")

urlpatterns = [
    path('audiobooks/checkout/', AudiobookCheckoutView.as_view(), name='audiobook-checkout'),
    path('audiobooks/<uuid:audiobook_id>/transcribe/', AudiobookTranscriptionView.as_view(), name='transcribe-audiobook'),

    path('', include(router.urls)),
    

]