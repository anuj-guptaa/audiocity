# backend/core/views.py
import os
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView

FRONTEND_URL = os.environ.get("FRONTEND_URL")

class GoogleLogin(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    callback_url = FRONTEND_URL  # uses env variable
    client_class = OAuth2Client