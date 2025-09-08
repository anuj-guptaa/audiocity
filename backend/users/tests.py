from django.test import TestCase
from django.contrib.auth import get_user_model
from django.db.utils import IntegrityError

User = get_user_model()

class UserManagerTests(TestCase):
    def test_create_user_with_email(self):
        """
        Test that a user can be created with an email and password.
        """
        user = User.objects.create_user(email='testuser@example.com', password='testpassword123')
        self.assertEqual(user.email, 'testuser@example.com')
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertIsNone(user.username)
        self.assertIsNotNone(user.password)

    def test_create_user_with_no_email_raises_error(self):
        """
        Test that creating a user without an email address raises a ValueError.
        """
        with self.assertRaises(ValueError):
            User.objects.create_user(email=None, password='testpassword123')

    def test_create_superuser(self):
        """
        Test that a superuser can be created successfully.
        """
        superuser = User.objects.create_superuser(email='superuser@example.com', password='superpassword')
        self.assertEqual(superuser.email, 'superuser@example.com')
        self.assertTrue(superuser.is_active)
        self.assertTrue(superuser.is_staff)
        self.assertTrue(superuser.is_superuser)

    def test_create_superuser_with_is_staff_false_raises_error(self):
        """
        Test that creating a superuser with is_staff=False raises a ValueError.
        """
        with self.assertRaises(ValueError):
            User.objects.create_superuser(email='superuser@example.com', password='superpassword', is_staff=False)
            
    def test_create_superuser_with_is_superuser_false_raises_error(self):
        """
        Test that creating a superuser with is_superuser=False raises a ValueError.
        """
        with self.assertRaises(ValueError):
            User.objects.create_superuser(email='superuser@example.com', password='superpassword', is_superuser=False)

    def test_email_is_unique(self):
        """
        Test that an email must be unique for user accounts.
        """
        User.objects.create_user(email='unique@example.com', password='password')
        with self.assertRaises(IntegrityError):
            User.objects.create_user(email='unique@example.com', password='anotherpassword')