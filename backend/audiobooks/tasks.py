# backend/audiobooks/tasks.py
from celery import shared_task
from .models import AudiobookFile, Audiobook
import openai
import os
from pydub import AudioSegment
import tempfile

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

@shared_task
def test_task():
    return "Hello Celery"

@shared_task
def transcribe_audio_file(audiobook_file_id):
    """
    Transcribe a single AudiobookFile and store the transcription JSON in Audiobook.
    """
    file_obj = AudiobookFile.objects.get(id=audiobook_file_id)
    audiobook = file_obj.audiobook

    # Download file locally
    audio_url = file_obj.file.url
    audio_file_path = tempfile.mktemp(suffix=".mp3")  # adjust extension

    # If using requests to download
    import requests
    r = requests.get(audio_url)
    with open(audio_file_path, "wb") as f:
        f.write(r.content)

    # Convert to WAV if needed
    audio_wav_path = audio_file_path.replace(".mp3", ".wav")
    AudioSegment.from_file(audio_file_path).export(audio_wav_path, format="wav")

    # Transcribe using OpenAI Whisper
    openai.api_key = OPENAI_API_KEY
    with open(audio_wav_path, "rb") as f:
        transcript = openai.audio.transcriptions.create(
            model="whisper-1",
            file=f
        )

    # Save transcription to audiobook
    import json
    if audiobook.transcription_file:
        # Append if transcription already exists
        existing = json.load(audiobook.transcription_file)
        combined = existing + [transcript]
    else:
        combined = [transcript]

    # Save transcription JSON to file
    from django.core.files.base import ContentFile
    audiobook.transcription_file.save(
        f"{audiobook.id}_transcription.json",
        ContentFile(json.dumps(combined)),
        save=True
    )

    return {"audiobook_file_id": audiobook_file_id, "status": "done"}