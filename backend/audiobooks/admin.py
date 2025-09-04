from django.contrib import admin

# Register your models here.
from .models import Audiobook, AudiobookFile
admin.site.register(Audiobook)
admin.site.register(AudiobookFile)
