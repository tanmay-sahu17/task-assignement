from django.contrib import admin
from .models import UserProfile

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'job_title', 'department', 'location')
    search_fields = ('user__username', 'user__email', 'job_title')
