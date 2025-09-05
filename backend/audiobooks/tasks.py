# backend/audiobooks/tasks.py
from celery import shared_task
from .models import AudiobookFile, Audiobook
import os
import tempfile
import requests
from pydub import AudioSegment
from django.core.files.base import ContentFile
import json
import logging
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)

AZURE_TRANSCRIBE_ENDPOINT = os.environ.get("AZURE_TRANSCRIBE_ENDPOINT")
AZURE_TRANSCRIBE_KEY = os.environ.get("AZURE_TRANSCRIBE_KEY")
AZURE_TRANSCRIBE_MODEL = os.environ.get("AZURE_TRANSCRIBE_MODEL", "gpt-4o-transcribe")

@shared_task
def test_task():
    return "Hello Celery"

@shared_task
def transcribe_audio_file(audiobook_file_id):
    """
    Transcribe a single AudiobookFile and store the transcription JSON in AudiobookFile.
    Then rebuild a combined transcription.json at the Audiobook level.
    """
    logger.info(f"Starting transcription for AudiobookFile ID {audiobook_file_id}")
    file_obj = AudiobookFile.objects.get(id=audiobook_file_id)

    # Download file locally
    audio_url = file_obj.file.url
    logger.info(f"Downloading audio from {audio_url}")
    audio_file_path = tempfile.mktemp(suffix=".mp3")
    r = requests.get(audio_url)
    r.raise_for_status()
    with open(audio_file_path, "wb") as f:
        f.write(r.content)

    # Convert to WAV
    audio_wav_path = audio_file_path.replace(".mp3", ".wav")
    AudioSegment.from_file(audio_file_path).export(audio_wav_path, format="wav")

    # Call Azure GPT-4o Transcribe API
    headers = {"api-key": AZURE_TRANSCRIBE_KEY}
    with open(audio_wav_path, "rb") as f:
        files = {"file": (os.path.basename(audio_wav_path), f, "audio/wav")}
        data = {"model": AZURE_TRANSCRIBE_MODEL}
        response = requests.post(
            AZURE_TRANSCRIBE_ENDPOINT,
            headers=headers,
            files=files,
            data=data,
        )
    response.raise_for_status()
    transcript = response.json()
    logger.info(f"Transcription result: {transcript}")

    # Save individual transcript
    file_obj.transcription_file.save(
        f"{file_obj.id}_transcription.json",
        ContentFile(json.dumps(transcript, ensure_ascii=False).encode("utf-8")),
        save=True,
    )

    # # Rebuild combined transcript at Audiobook level
    # combined = []
    # for f in file_obj.audiobook.audio_files.order_by("order"):
    #     if f.transcription_file:
    #         f.transcription_file.open("rb")
    #         try:
    #             content = f.transcription_file.read().decode("utf-8")
    #             if content.strip():
    #                 data = json.loads(content)
    #                 combined.append({
    #                     "file_id": str(f.id),
    #                     "order": f.order,
    #                     "transcript": data,
    #                 })
    #         finally:
    #             f.transcription_file.close()

    # file_obj.audiobook.transcription_file.save(
    #     f"{file_obj.audiobook.id}_transcription.json",
    #     ContentFile(json.dumps(combined, ensure_ascii=False, indent=2).encode("utf-8")),
    #     save=True,
    # )

    return {"audiobook_file_id": audiobook_file_id, "status": "done"}