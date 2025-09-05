from django.contrib import admin
from .models import Audiobook, AudiobookFile

@admin.register(Audiobook)
class AudiobookAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "author")  # add the fields you want to show

@admin.register(AudiobookFile)
class AudiobookFileAdmin(admin.ModelAdmin):
    list_display = ("id", "audiobook", "file")  # customize fields as needed