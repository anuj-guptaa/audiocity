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

AZURE_SUMMARIZE_ENDPOINT = os.environ.get("AZURE_SUMMARIZE_ENDPOINT")
AZURE_SUMMARIZE_KEY = os.environ.get("AZURE_SUMMARIZE_KEY")
AZURE_SUMMARIZE_MODEL = os.environ.get("AZURE_SUMMARIZE_MODEL", "gpt-4o-mini")

# Define a custom exception for AI service errors.
# Celery will use this to determine which errors should trigger a retry.
class AIServiceError(Exception):
    """Raised when an AI service call fails."""
    pass

@shared_task(bind=True,  # Binds the task instance to the function, allowing access to `self`
             autoretry_for=(AIServiceError, RequestException), # Error handling IF openai api fails
             retry_kwargs={'max_retries': 5, 'countdown': 60}) # Max 5 retries
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




@shared_task(bind=True,
             autoretry_for=(AIServiceError, RequestException),
             retry_kwargs={'max_retries': 5, 'countdown': 60})
def generate_summary_and_tags(self, audiobook_id):
    """
    Generate a 1-paragraph summary and up to 3 tags from the first transcription
    of the given Audiobook, and store them in description and tags fields.
    """
    logger.info(f"Starting summary/tag generation for Audiobook ID {audiobook_id}")
    try:
        # 1. Get the audiobook and its first transcription file
        audiobook = Audiobook.objects.get(id=audiobook_id)
        first_file = AudiobookFile.objects.filter(
            audiobook=audiobook,
            transcription_file__isnull=False
        ).order_by("created_at").first()

        if not first_file:
            logger.warning(f"No transcription available for audiobook {audiobook_id}")
            return {"audiobook_id": audiobook_id, "status": "no_transcription"}

        # Load the transcription JSON
        transcript_content = first_file.transcription_file.read().decode("utf-8")
        transcript_data = json.loads(transcript_content)

        # Extract text depending on transcript format
        transcript_text = transcript_data.get("text") or transcript_content
        logger.debug(f"Transcript snippet for {audiobook_id}: {transcript_text[:200]}...")

        # 2. Call Azure LLM for summary + tags
        headers = {
            "api-key": AZURE_SUMMARIZE_KEY,
            "Content-Type": "application/json"
        }
        payload = {
            "model": AZURE_SUMMARIZE_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a helpful assistant that summarizes audiobook transcripts. "
                        "Always return output in strict JSON format with keys: "
                        "`summary` (string, 1 paragraph) and `tags` (list of up to 3 strings)."
                    )
                },
                {
                    "role": "user",
                    "content": f"Here is a transcript:\n\n{transcript_text}\n\nSummarize it now."
                }
            ],
            "max_tokens": 300,
        }

        try:
            response = requests.post(
                AZURE_SUMMARIZE_ENDPOINT,
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
        except HTTPError as e:
            logger.error(f"AI summary API returned an error for audiobook {audiobook_id}: {e}")
            raise AIServiceError(f"AI API error: {e}")
        except RequestException as e:
            logger.error(f"AI summary API request failed for audiobook {audiobook_id}: {e}")
            raise AIServiceError(f"AI API request error: {e}")

        result = response.json()
        logger.debug(f"Raw AI response: {result}")

        # Extract AI output (structured JSON string)
        ai_output = result.get("choices", [{}])[0].get("message", {}).get("content", "").strip()

        try:
            parsed = json.loads(ai_output)
        except json.JSONDecodeError:
            logger.error(f"Failed to decode AI output as JSON: {ai_output}")
            raise AIServiceError("AI did not return valid JSON")

        summary = parsed.get("summary", "").strip()
        tags = parsed.get("tags", [])

        # 3. Save into Audiobook model (description + comma-separated tags)
        audiobook.description = summary
        audiobook.tags = ", ".join(tags)
        audiobook.save()

        logger.info(f"Successfully generated summary/tags for Audiobook {audiobook_id}")
        return {"audiobook_id": audiobook_id, "status": "success", "description": summary, "tags": tags}

    except Audiobook.DoesNotExist:
        logger.error(f"Audiobook not found: {audiobook_id}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error while generating summary/tags for audiobook {audiobook_id}: {e}")
        raise self.retry(exc=e)
