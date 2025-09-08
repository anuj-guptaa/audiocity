from django.urls import path
from .views import CurrentUserView

urlpatterns = [
    # The 'me/' endpoint will return the current user's details.
    path('me/', CurrentUserView.as_view(), name='current-user'),
]
