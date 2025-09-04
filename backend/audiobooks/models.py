import uuid
from django.db import models
from .storages_backends import AzureAudiobookStorage

def cover_upload_path(instance, filename):
    return f"{instance.id}/cover.jpg"

def transcription_upload_path(instance, filename):
    return f"{instance.id}/transcription.json"

def audio_upload_path(instance, filename):
    return f"{instance.audiobook.id}/audio/{uuid.uuid4()}_{filename}"

class Audiobook(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    author = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)

    cover_image = models.FileField(storage=AzureAudiobookStorage(), upload_to=cover_upload_path)
    transcription_file = models.FileField(storage=AzureAudiobookStorage(), upload_to=transcription_upload_path, blank=True, null=True)

    tags = models.CharField(max_length=200, blank=True)  # Comma-separated tags
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class AudiobookFile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    audiobook = models.ForeignKey(Audiobook, related_name="audio_files", on_delete=models.CASCADE)
    file = models.FileField(storage=AzureAudiobookStorage(), upload_to=audio_upload_path)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.audiobook.title} - File {self.order}"
