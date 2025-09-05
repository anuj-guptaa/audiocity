from celery import shared_task, Task
from .models import AudiobookFile, Audiobook
import os
import tempfile
import requests
from pydub import AudioSegment
from django.core.files.base import ContentFile
import json
import logging
from django.core.files.base import ContentFile
from requests.exceptions import RequestException, HTTPError

logger = logging.getLogger(__name__)

AZURE_TRANSCRIBE_ENDPOINT = os.environ.get("AZURE_TRANSCRIBE_ENDPOINT")
AZURE_TRANSCRIBE_KEY = os.environ.get("AZURE_TRANSCRIBE_KEY")
AZURE_TRANSCRIBE_MODEL = os.environ.get("AZURE_TRANSCRIBE_MODEL", "gpt-4o-transcribe")

# Define a custom exception for AI service errors.
# Celery will use this to determine which errors should trigger a retry.
class AIServiceError(Exception):
    """Raised when an AI service call fails."""
    pass

@shared_task(bind=True,  # Binds the task instance to the function, allowing access to `self`
             autoretry_for=(AIServiceError, RequestException), # Retry for these specific exceptions
             retry_kwargs={'max_retries': 5, 'countdown': 60}) # Max 5 retries with exponential backoff
def transcribe_audio_file(self, audiobook_file_id):
    """
    Transcribe a single AudiobookFile and store the transcription JSON.
    This task is designed to be resilient to network and AI service failures.
    """
    logger.info(f"Starting transcription for AudiobookFile ID {audiobook_file_id}")
    file_obj = AudiobookFile.objects.get(id=audiobook_file_id)
    file_obj.status = 'PROCESSING'
    file_obj.save()

    audio_file_path = None
    audio_wav_path = None

    try:
        # 1. Download file locally from Azure Blob Storage
        audio_url = file_obj.file.url
        logger.info(f"Downloading audio from {audio_url}")
        audio_file_path = tempfile.mktemp(suffix=".mp3")
        try:
            r = requests.get(audio_url)
            r.raise_for_status() # Raise an exception for bad status codes
            with open(audio_file_path, "wb") as f:
                f.write(r.content)
        except RequestException as e:
            logger.error(f"Download failed for file {audiobook_file_id}: {e}")
            raise AIServiceError(f"Download error: {e}")

        # 2. Convert to WAV format using pydub
        audio_wav_path = audio_file_path.replace(".mp3", ".wav")
        try:
            AudioSegment.from_file(audio_file_path).export(audio_wav_path, format="wav")
        except Exception as e:
            logger.error(f"File conversion failed for {audiobook_file_id}: {e}")
            # Raise a custom exception to signal a need for Celery retry
            raise AIServiceError(f"Audio conversion error: {e}")

        # 3. Call Azure GPT-4o Transcribe API
        headers = {"api-key": AZURE_TRANSCRIBE_KEY}
        with open(audio_wav_path, "rb") as f:
            files = {"file": (os.path.basename(audio_wav_path), f, "audio/wav")}
            data = {"model": AZURE_TRANSCRIBE_MODEL}
            try:
                response = requests.post(
                    AZURE_TRANSCRIBE_ENDPOINT,
                    headers=headers,
                    files=files,
                    data=data,
                )
                response.raise_for_status() # Raise for bad status codes (4xx or 5xx)
            except HTTPError as e:
                logger.error(f"AI transcription API returned an error for {audiobook_file_id}: {e}")
                # Raise a custom exception to signal a need for Celery retry
                raise AIServiceError(f"AI API error: {e}")
            except RequestException as e:
                logger.error(f"AI transcription API request failed for {audiobook_file_id}: {e}")
                raise AIServiceError(f"AI API request error: {e}")

        transcript = response.json()
        logger.info(f"Transcription result for {audiobook_file_id}: {transcript}")

        # 4. Save individual transcript to the AudiobookFile model
        file_obj.transcription_file.save(
            f"{file_obj.id}_transcription.json",
            ContentFile(json.dumps(transcript, ensure_ascii=False).encode("utf-8")),
            save=True,
        )

        file_obj.status = 'SUCCESS'
        file_obj.save()
        logger.info(f"Successfully processed AudiobookFile {audiobook_file_id}")
        return {"audiobook_file_id": audiobook_file_id, "status": "success"}

    except (AudiobookFile.DoesNotExist, Audiobook.DoesNotExist) as e:
        logger.error(f"Audiobook file or audiobook not found: {e}")
        # Do not retry, as this is a permanent error.
        raise e

    except Exception as e:
        # Catch any unexpected errors that were not handled above.
        logger.error(f"An unexpected error occurred for {audiobook_file_id}: {e}")
        file_obj.status = 'FAILED'
        file_obj.save()
        # Raise an exception to tell Celery to retry
        # The 'autoretry_for' decorator will handle the retry logic.
        raise self.retry(exc=e)

    finally:
        # Clean up temporary files
        if audio_file_path and os.path.exists(audio_file_path):
            os.remove(audio_file_path)
        if audio_wav_path and os.path.exists(audio_wav_path):
            os.remove(audio_wav_path)
