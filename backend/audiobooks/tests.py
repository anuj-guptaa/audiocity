from django.test import TestCase
from unittest import mock
from rest_framework.test import APIClient
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from datetime import datetime, timedelta
import json
import os
import requests
from django.core.files.base import ContentFile
import uuid


from audiobooks.models import Audiobook, AudiobookFile
from users.models import User
from audiobooks.tasks import transcribe_audio_file, generate_summary_and_tags, AIServiceError
from audiobooks.views import AudiobookViewSet, AudiobookCheckoutView

class AudiobookViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email=f'user_{uuid.uuid4().hex}@test.com', password='password'
        )
        self.admin = User.objects.create_superuser(
            email=f'admin_{uuid.uuid4().hex}@test.com', password='password'
        )

        # Mock authentication for admin
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(user=self.admin)
        
        # Mock authentication for regular user
        self.user_client = APIClient()
        self.user_client.force_authenticate(user=self.user)

    @mock.patch('audiobooks.views.transcribe_audio_file.delay')
    def test_create_audiobook_success(self, mock_transcribe_task):
        """
        Test Case 1: Successful Audiobook Creation
        Objective: Verify that an administrator can successfully create a new audiobook.
        """
        cover_file = SimpleUploadedFile("cover.jpg", b"file_content", "image/jpeg")
        audio_file1 = SimpleUploadedFile("part1.mp3", b"audio_content1", "audio/mpeg")
        audio_file2 = SimpleUploadedFile("part2.mp3", b"audio_content2", "audio/mpeg")

        data = {
            "title": "Test Audiobook",
            "author": "Test Author",
            "price": "9.99",
            "cover_image": cover_file,
            "audio_files": [audio_file1, audio_file2],
            "audio_orders": [1, 2],
        }
        
        response = self.admin_client.post(reverse("audiobook-list"), data, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Audiobook.objects.count(), 1)
        audiobook = Audiobook.objects.first()
        self.assertEqual(audiobook.title, "Test Audiobook")
        self.assertEqual(AudiobookFile.objects.count(), 2)

        # Assert Celery task was queued for each audio file
        self.assertEqual(mock_transcribe_task.call_count, 2)
        
        # Reset file pointers
        cover_file.seek(0)
        audio_file1.seek(0)
        audio_file2.seek(0)
        
    def test_create_audiobook_failure_missing_data(self):
        """
        Test Case 2: Failed Audiobook Creation (Missing Data)
        Objective: Ensure that an audiobook is not created if required fields are missing.
        """
        data = {
            "title": "Test Audiobook",
            "author": "Test Author",
            # 'price' and 'cover_image' are missing fields
        }
        response = self.admin_client.post(reverse("audiobook-list"), data, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Audiobook.objects.count(), 0)

    @mock.patch('audiobooks.views.AudiobookViewSet.delete_blob')
    def test_delete_audiobook_success(self, mock_delete_blob):
        """
        Test Case 3: Successful Audiobook Deletion
        Objective: Confirm that an audiobook and all its associated files are correctly deleted.
        """
        # Create a mock audiobook and associated files
        cover_file = SimpleUploadedFile("cover.jpg", b"file_content", "image/jpeg")
        audiobook = Audiobook.objects.create(
            title="Test Audiobook",
            author="Test Author",
            price="10.00",
            cover_image=cover_file
        )
        audiobook_file = AudiobookFile.objects.create(
            audiobook=audiobook,
            file=SimpleUploadedFile("audio.mp3", b"audio_content"),
            order=1
        )
        
        url = reverse("audiobook-detail", args=[audiobook.id])
        response = self.admin_client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Audiobook.objects.count(), 0)
        self.assertEqual(AudiobookFile.objects.count(), 0)
        
        # Verify that the mock delete_blob function was called
        self.assertTrue(mock_delete_blob.called)

    def test_delete_audiobook_unauthorized(self):
        """
        Test Case 4: Unauthorized Deletion
        Objective: Prevent unauthorized users from deleting audiobooks.
        """
        # Create a mock audiobook
        cover_file = SimpleUploadedFile("cover.jpg", b"file_content", "image/jpeg")
        audiobook = Audiobook.objects.create(
            title="Test Audiobook",
            author="Test Author",
            price="10.00",
            cover_image=cover_file
        )
        url = reverse("audiobook-detail", args=[audiobook.id])
        
        # Try to delete as a regular user
        response = self.user_client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Assert the audiobook still exists
        self.assertEqual(Audiobook.objects.count(), 1)


class AudiobookCheckoutViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email='user@test.com', password='password')
        self.client.force_authenticate(user=self.user)
        
        # Create a mock audiobook with files
        cover_file = SimpleUploadedFile("cover.jpg", b"file_content", "image/jpeg")
        self.audiobook1 = Audiobook.objects.create(
            title="Test Audiobook 1",
            author="Author 1",
            price="15.50",
            cover_image=cover_file
        )
        self.audio_file1_1 = AudiobookFile.objects.create(audiobook=self.audiobook1, file=SimpleUploadedFile("audio1_1.mp3", b"content"), order=1)
        self.audio_file1_2 = AudiobookFile.objects.create(audiobook=self.audiobook1, file=SimpleUploadedFile("audio1_2.mp3", b"content"), order=2)

    @mock.patch('audiobooks.views.AudiobookCheckoutView.get_blob_sas_url')
    def test_successful_checkout(self, mock_get_blob_sas_url):
        """
        Test Case 1: Successful Checkout and Download Link Generation
        Objective: Validate that a user can successfully "purchase" items and receive temporary download URLs.
        """
        # Mock SAS URL generation
        mock_get_blob_sas_url.return_value = "http://mock-sas-url.com/file.mp3?token=mocktoken"

        data = {"items": [str(self.audiobook1.id)]}
        response = self.client.post(reverse('audiobook-checkout'), data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("download_links", response.data)
        
        links = response.data["download_links"]
        self.assertEqual(len(links), 1)
        
        audiobook_data = links[0]
        self.assertEqual(audiobook_data["id"], str(self.audiobook1.id))
        self.assertEqual(len(audiobook_data["audio_urls"]), 2)
        self.assertIn("url", audiobook_data["audio_urls"][0])
        self.assertIn("url", audiobook_data["audio_urls"][1])
        
    def test_checkout_with_invalid_item(self):
        """
        Test Case 2: Checkout with Invalid Item IDs
        Objective: Handle cases where a user tries to purchase an audiobook that doesn't exist.
        """
        invalid_id = "11111111-1111-1111-1111-111111111111"
        data = {"items": [invalid_id]}
        response = self.client.post(reverse('audiobook-checkout'), data, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("error", response.data)
        self.assertIn("audiobooks not found", response.data["error"])

class CeleryTaskTests(TestCase):
    def setUp(self):
        cover_file = SimpleUploadedFile("cover.jpg", b"file_content", "image/jpeg")
        self.audiobook = Audiobook.objects.create(
            title="Test Audiobook",
            author="Test Author",
            price="10.00",
            cover_image=cover_file
        )
        self.audiobook_file = AudiobookFile.objects.create(
            audiobook=self.audiobook,
            file=SimpleUploadedFile("audio.mp3", b"audio_content"),
            order=1
        )
        
        self.mock_transcription_data = {"text": "This is a mock transcription."}
        self.mock_summary_data = {"summary": "This is a mock summary.", "tags": ["tag1", "tag2"]}

    @mock.patch('requests.post')
    @mock.patch('requests.get')
    @mock.patch('pydub.AudioSegment.from_file')
    @mock.patch('builtins.open', new_callable=mock.mock_open, read_data=b"fake_audio_data")
    def test_successful_transcription(self, mock_open, mock_pydub, mock_requests_get, mock_requests_post):
        """
        Test Case 1: Successful Transcription
        Objective: Confirm that transcribe_audio_file correctly processes an audio file and saves the transcription.
        """
        # Mock successful download
        mock_requests_get.return_value.raise_for_status.return_value = None
        mock_requests_get.return_value.content = b"audio_content"

        # Mock pydub processing
        mock_pydub.return_value.export.return_value = None

        # Mock successful transcription API call
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = self.mock_transcription_data
        mock_requests_post.return_value = mock_response

        # Call the task
        transcribe_audio_file(str(self.audiobook_file.id))

        # Refresh from DB
        file_obj = AudiobookFile.objects.get(id=self.audiobook_file.id)
        self.assertEqual(file_obj.status, 'SUCCESS')

        # Ensure transcription file exists
        self.assertTrue(file_obj.transcription_file)

        # Read the transcription content safely
        file_obj.transcription_file.open('r')
        transcription_content = json.load(file_obj.transcription_file)
        file_obj.transcription_file.close()

        self.assertEqual(transcription_content, self.mock_transcription_data)


    @mock.patch('requests.post')
    @mock.patch('requests.get')
    def test_transcription_failure_ai_service_error(self, mock_requests_get, mock_requests_post):
        """
        Test Case 2: Transcription Failure (AI Service Error)
        Objective: Verify that the task handles external service failures gracefully.
        """
        # Mock successful download
        mock_requests_get.return_value.raise_for_status.return_value = None
        mock_requests_get.return_value.content = b"audio_content"

        # Mock failed transcription API call
        mock_requests_post.side_effect = requests.exceptions.HTTPError("Bad Request")

        with self.assertRaises(AIServiceError):
            transcribe_audio_file(str(self.audiobook_file.id))

        file_obj = AudiobookFile.objects.get(id=self.audiobook_file.id)
        self.assertEqual(file_obj.status, 'FAILED')
        self.assertFalse(file_obj.transcription_file.name)
        
    @mock.patch('requests.post')
    def test_successful_summary_generation(self, mock_requests_post):
        """
        Test Case 3: Successful Summary and Tag Generation
        Objective: Ensure that the task correctly uses the first transcript to generate and save a summary and tags.
        """
        # Save a mock transcription file
        mock_transcript_content = '{"text": "This is a transcript"}'
        self.audiobook_file.transcription_file.save(
            "mock_transcript.json",
            ContentFile(mock_transcript_content.encode("utf-8"))
        )
        
        # Mock successful summarization API call
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"choices": [{"message": {"content": json.dumps(self.mock_summary_data)}}]}
        mock_requests_post.return_value = mock_response

        generate_summary_and_tags(str(self.audiobook.id))
        
        audiobook = Audiobook.objects.get(id=self.audiobook.id)
        self.assertEqual(audiobook.description, "This is a mock summary.")
        self.assertEqual(audiobook.tags, "tag1, tag2")

    @mock.patch('requests.post')
    def test_summary_generation_invalid_ai_output(self, mock_requests_post):
        """
        Test Case 4: Summary Generation Failure (Invalid AI Output)
        Objective: Test for graceful failure if the AI service returns invalid JSON.
        """
        # Save a mock transcription file
        mock_transcript_content = '{"text": "This is a transcript"}'
        self.audiobook_file.transcription_file.save(
            "mock_transcript.json",
            ContentFile(mock_transcript_content.encode("utf-8"))
        )

        # Mock AI response with invalid JSON
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"choices": [{"message": {"content": "not-json-content"}}]}
        mock_requests_post.return_value = mock_response
        
        with self.assertRaises(AIServiceError):
            generate_summary_and_tags(str(self.audiobook.id))
            
        audiobook = Audiobook.objects.get(id=self.audiobook.id)
        self.assertEqual(audiobook.description, "") # Assert description remains unchanged
        self.assertEqual(audiobook.tags, "") # Assert tags remain unchanged