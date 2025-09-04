from rest_framework import viewsets
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from datetime import datetime, timedelta

from azure.storage.blob import generate_blob_sas, BlobSasPermissions

from .models import Audiobook, AudiobookFile
from .serializers import AudiobookSerializer
import os

AZURE_STORAGE_ACCOUNT_NAME = os.environ.get("AZURE_ACCOUNT_NAME")
AZURE_STORAGE_ACCOUNT_KEY = os.environ.get("AZURE_ACCOUNT_KEY")
AZURE_CONTAINER_NAME = os.environ.get("AZURE_CONTAINER")

class AudiobookViewSet(viewsets.ModelViewSet):
    queryset = Audiobook.objects.all().order_by("-created_at")
    serializer_class = AudiobookSerializer
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        title = request.data.get("title")
        author = request.data.get("author")
        description = request.data.get("description", "")
        tags = request.data.get("tags", "")
        price = request.data.get("price")
        cover_image = request.data.get("cover_image")

        if not all([title, author, price, cover_image]):
            return Response({"detail": "Missing required fields."}, status=status.HTTP_400_BAD_REQUEST)

        audiobook = Audiobook.objects.create(
            title=title,
            author=author,
            description=description,
            tags=tags,
            price=price,
            cover_image=cover_image,
        )

        audio_files = request.FILES.getlist("audio_files")
        audio_orders = request.data.getlist("audio_orders")

        for i, file in enumerate(audio_files):
            order = int(audio_orders[i]) if i < len(audio_orders) else i
            AudiobookFile.objects.create(audiobook=audiobook, file=file, order=order)

        serializer = self.get_serializer(audiobook)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
class AudiobookCheckoutView(APIView):
    """
    Handles the checkout process for audiobooks.
    Generates secure, time-limited download URLs for all audio and transcription files.
    """

    # permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        try:
            item_ids = request.data.get("items", [])
            if not isinstance(item_ids, list) or not item_ids:
                return Response(
                    {"error": "Invalid request body. 'items' list is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            audiobooks = Audiobook.objects.filter(id__in=item_ids)
            if audiobooks.count() != len(item_ids):
                return Response(
                    {"error": "One or more audiobooks not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            download_links = []

            for audiobook in audiobooks:
                audio_urls = [
                    {
                        "url": self.get_blob_sas_url(file_obj.file.name),
                        "order": file_obj.order,
                    }
                    for file_obj in audiobook.audio_files.all().order_by("order")
                ]

                transcription_urls = []
                if audiobook.transcription_file:
                    transcription_urls.append({
                        "url": self.get_blob_sas_url(audiobook.transcription_file.name),
                        "order": 1,
                    })

                download_links.append({
                    "id": str(audiobook.id),
                    "title": audiobook.title,
                    "cover_image": audiobook.cover_image.url if audiobook.cover_image else None,
                    "audio_urls": audio_urls,
                    "transcription_urls": transcription_urls,
                })

            return Response({
                "message": "Order processed successfully.",
                "download_links": download_links
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def get_blob_sas_url(self, blob_name: str) -> str:
        if not AZURE_STORAGE_ACCOUNT_KEY or not AZURE_STORAGE_ACCOUNT_NAME:
            raise ValueError("Azure credentials are not set.")

        sas_token = generate_blob_sas(
            account_name=AZURE_STORAGE_ACCOUNT_NAME,
            container_name=AZURE_CONTAINER_NAME,
            blob_name=blob_name,
            account_key=AZURE_STORAGE_ACCOUNT_KEY,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.utcnow() + timedelta(hours=1)
        )
        return f"https://{AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/{AZURE_CONTAINER_NAME}/{blob_name}?{sas_token}"