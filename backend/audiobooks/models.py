import uuid
from django.db import models
from .storages_backends import AzureAudiobookStorage

def cover_upload_path(instance, filename):
    return f"{instance.id}/cover.jpg"

def transcription_upload_path(instance, filename):
    return f"{instance.id}/transcription.json"

def audio_upload_path(instance, filename):
    return f"{instance.id}/audio/audiobook.mp3"

class Audiobook(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    author = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)

    cover_image = models.FileField(storage=AzureAudiobookStorage(), upload_to=cover_upload_path)
    transcription_file = models.FileField(storage=AzureAudiobookStorage(), upload_to=transcription_upload_path, blank=True, null=True)
    audio_file = models.FileField(storage=AzureAudiobookStorage(), upload_to=audio_upload_path)

    tags = models.CharField(max_length=200, blank=True)  # Comma-separated tags
    created_at = models.DateTimeField(auto_now_add=True)