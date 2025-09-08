from rest_framework import viewsets
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from datetime import datetime, timedelta

from azure.storage.blob import generate_blob_sas, BlobSasPermissions
from azure.storage.blob import BlobServiceClient

from .models import Audiobook, AudiobookFile
from .serializers import AudiobookSerializer

from .tasks import transcribe_audio_file, generate_summary_and_tags

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

        for af in created_files:
            transcribe_audio_file.delay(str(af.id))

        serializer = self.get_serializer(audiobook)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        audiobook = self.get_object()
        # Delete associated files from Azure Blob Storage
        for file_obj in audiobook.audio_files.all():
            if file_obj.file:
                self.delete_blob(file_obj.file.name)
            if file_obj.transcription_file:
                self.delete_blob(file_obj.transcription_file.name)

        # Delete cover image if exists
        if audiobook.cover_image:
            self.delete_blob(audiobook.cover_image.name)

        # Delete audiobook and related AudiobookFile objects
        audiobook.delete()
        return Response({"message": "Audiobook and all associated files deleted."}, status=status.HTTP_204_NO_CONTENT)

    def delete_blob(self, blob_name: str):
        

        if not AZURE_STORAGE_ACCOUNT_KEY or not AZURE_STORAGE_ACCOUNT_NAME:
            raise ValueError("Azure credentials are not set.")

        blob_service_client = BlobServiceClient(
            f"https://{AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net",
            credential=AZURE_STORAGE_ACCOUNT_KEY
        )
        blob_client = blob_service_client.get_blob_client(container=AZURE_CONTAINER_NAME, blob=blob_name)
        try:
            blob_client.delete_blob()
            print(f"Deleted blob: {blob_name}")
        except Exception as e:
            print(f"Error deleting blob {blob_name}: {e}")
    
class AudiobookCheckoutView(APIView):
    """
    Handles the checkout process for audiobooks.
    Generates secure, time-limited download URLs for all audio and transcription files.
    """

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
    

class AudiobookSummaryView(APIView):
    """
    Trigger summary and tag generation for a given audiobook
    """
    def post(self, request, audiobook_id):
        try:
            audiobook = Audiobook.objects.get(id=audiobook_id)
            print(f"Found audiobook: {audiobook.title}")
        except Audiobook.DoesNotExist:
            return Response({"error": "Audiobook not found"}, status=status.HTTP_404_NOT_FOUND)

        # Queue Celery task
        generate_summary_and_tags.delay(str(audiobook.id))

        return Response(
            {"message": "Summary and tags generation task queued."},
            status=status.HTTP_202_ACCEPTED
        )