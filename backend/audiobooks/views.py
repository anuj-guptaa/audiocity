from rest_framework import viewsets
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from datetime import datetime, timedelta

from azure.storage.blob import generate_blob_sas, BlobSasPermissions

from .models import Audiobook
from .serializers import AudiobookSerializer
import os

AZURE_STORAGE_ACCOUNT_NAME = os.environ.get("AZURE_ACCOUNT_NAME")
AZURE_STORAGE_ACCOUNT_KEY = os.environ.get("AZURE_ACCOUNT_KEY")
AZURE_CONTAINER_NAME = os.environ.get("AZURE_CONTAINER")

class AudiobookViewSet(viewsets.ModelViewSet):
    queryset = Audiobook.objects.all().order_by("-created_at")
    serializer_class = AudiobookSerializer
    parser_classes = [MultiPartParser, FormParser]  # for file uploads


class AudiobookCheckoutView(APIView):
    """
    Handles the checkout process for audiobooks.
    Validates the request and generates secure, time-limited download URLs.
    """

    # You would typically add permission classes here to restrict access to authenticated users
    # permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """
        Processes a checkout request.
        """
        try:
            item_ids = request.data.get('items', [])
            if not isinstance(item_ids, list) or not item_ids:
                return Response({"error": "Invalid request body. 'items' list is required."}, status=status.HTTP_400_BAD_REQUEST)

            # Fetch audiobooks from the database using Django's ORM
            # This handles validation and checks if the items exist
            audiobooks = Audiobook.objects.filter(id__in=item_ids)

            if audiobooks.count() != len(item_ids):
                return Response({"error": "One or more audiobooks not found."}, status=status.HTTP_404_NOT_FOUND)

            download_links = []
            for audiobook in audiobooks:
                try:
                    # Generate a SAS URL for the audio file
                    audio_url = self.get_blob_sas_url(audiobook.audio_file.name)
                    
                    # Generate a SAS URL for the transcription file
                    transcription_url = self.get_blob_sas_url(audiobook.transcription_file.name)

                    download_links.append({
                        "id": str(audiobook.id),
                        "title": audiobook.title,
                        "audio_url": audio_url,
                        "transcription_url": transcription_url,
                    })
                except ValueError as e:
                    # Log the error and continue, but don't fail the entire request
                    print(f"Error generating SAS for audiobook {audiobook.id}: {e}")
                    continue

            return Response({
                "message": "Order processed successfully.",
                "download_links": download_links
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"An unexpected error occurred: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get_blob_sas_url(self, blob_name: str) -> str:
        """
        Generates a read-only SAS URL for a blob that is valid for 1 hour.
        """
        if not AZURE_STORAGE_ACCOUNT_KEY or not AZURE_STORAGE_ACCOUNT_NAME:
            raise ValueError("Azure credentials are not set.")
        
        # This function generates the token for a specific blob.
        sas_token = generate_blob_sas(
            account_name=AZURE_STORAGE_ACCOUNT_NAME,
            container_name=AZURE_CONTAINER_NAME,
            blob_name=blob_name,
            account_key=AZURE_STORAGE_ACCOUNT_KEY,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.utcnow() + timedelta(hours=1)
        )
        return f"https://{AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/{AZURE_CONTAINER_NAME}/{blob_name}?{sas_token}"