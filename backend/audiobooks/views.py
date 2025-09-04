from rest_framework import viewsets
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Audiobook
from .serializers import AudiobookSerializer

class AudiobookViewSet(viewsets.ModelViewSet):
    queryset = Audiobook.objects.all().order_by("-created_at")
    serializer_class = AudiobookSerializer
    parser_classes = [MultiPartParser, FormParser]  # for file uploads
