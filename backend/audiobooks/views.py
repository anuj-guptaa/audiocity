from rest_framework import viewsets
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from datetime import datetime, timedelta

from azure.storage.blob import generate_blob_sas, BlobSasPermissions

from .models import Audiobook, AudiobookFile
from .serializers import AudiobookSerializer

from .tasks import transcribe_audio_file

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

        created_files = []
        for i, file in enumerate(audio_files):
            order = int(audio_orders[i]) if i < len(audio_orders) else i
            af = AudiobookFile.objects.create(audiobook=audiobook, file=file, order=order)
            created_files.append(af)

        # --- AUTOMATICALLY QUEUE TRANSCRIPTION TASKS ---
        for af in created_files:
            transcribe_audio_file.delay(str(af.id))

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
                audio_urls = []
                file_transcriptions = []

                for file_obj in audiobook.audio_files.all().order_by("order"):
                    audio_urls.append({
                        "url": self.get_blob_sas_url(file_obj.file.name),
                        "order": file_obj.order,
                    })
                    if file_obj.transcription_file:
                        file_transcriptions.append({
                            "file_id": str(file_obj.id),
                            "url": self.get_blob_sas_url(file_obj.transcription_file.name),
                            "order": file_obj.order,
                        })

                download_links.append({
                    "id": str(audiobook.id),
                    "title": audiobook.title,
                    "cover_image": audiobook.cover_image.url if audiobook.cover_image else None,
                    "audio_urls": audio_urls,
                    "transcription_urls": file_transcriptions,  # only individual file transcriptions
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
    

    
class AudiobookTranscriptionView(APIView):
    """
    Trigger transcription for all audio files of a given audiobook
    """
    def post(self, request, audiobook_id):
        try:
            audiobook = Audiobook.objects.get(id=audiobook_id)
            print(f"Found audiobook: {audiobook.title}")
            print(audiobook)
        except Audiobook.DoesNotExist:
            return Response({"error": "Audiobook not found"}, status=status.HTTP_404_NOT_FOUND)

        print("Starting for loop")
        print(audiobook.audio_files.all())
        for file_obj in audiobook.audio_files.all():
            print(file_obj)
            print(f"Transcribing file")
            print(file_obj.id)
            transcribe_audio_file.delay(str(file_obj.id))  # Run async with Celery

        return Response({"message": "Transcription tasks queued."}, status=status.HTTP_202_ACCEPTED)