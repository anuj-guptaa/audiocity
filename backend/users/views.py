from rest_framework import generics, permissions
from rest_framework.response import Response

# from .models import User
from .serializers import UserSerializer

class CurrentUserView(generics.RetrieveAPIView):
    """
    API view to get the details of the currently authenticated user.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        # The request.user object is provided by Django's authentication middleware
        # and represents the currently authenticated user.
        return self.request.user
