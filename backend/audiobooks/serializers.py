from rest_framework import serializers
from .models import Audiobook

class AudiobookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Audiobook
        fields = [
            "id",
            "title",
            "author",
            "price",
            "description",
            "cover_image",
            "transcription_file",
            "audio_file",
            "tags",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]