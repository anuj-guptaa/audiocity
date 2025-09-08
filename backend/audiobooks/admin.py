from django.contrib import admin
from .models import Audiobook, AudiobookFile

@admin.register(Audiobook)
class AudiobookAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "author")   # customize fields as needed

@admin.register(AudiobookFile)
class AudiobookFileAdmin(admin.ModelAdmin):
    list_display = ("id", "audiobook", "file")  # customize fields as needed