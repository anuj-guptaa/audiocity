from rest_framework import serializers
from .models import Audiobook, AudiobookFile

class AudiobookFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AudiobookFile
        fields = ["id", "file", "order"]

class AudiobookSerializer(serializers.ModelSerializer):
    audio_files = AudiobookFileSerializer(many=True, read_only=True)

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
            "tags",
            "created_at",
            "audio_files",
        ]
        read_only_fields = ["id", "created_at"]
