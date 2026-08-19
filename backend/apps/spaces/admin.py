from django.contrib import admin
from .models import Space, Page, Sprint, ProjectStatus

@admin.register(Space)
class SpaceAdmin(admin.ModelAdmin):
    list_display = ('name', 'key', 'project', 'created_by', 'created_at')
    search_fields = ('name', 'key')
    list_filter = ('created_at',)

@admin.register(Page)
class PageAdmin(admin.ModelAdmin):
    list_display = ('title', 'space', 'created_by', 'updated_at')
    search_fields = ('title',)
    list_filter = ('updated_at',)

@admin.register(Sprint)
class SprintAdmin(admin.ModelAdmin):
    list_display = ('name', 'space', 'status', 'start_date', 'end_date', 'order')
    list_filter = ('status', 'space')
    search_fields = ('name',)

@admin.register(ProjectStatus)
class ProjectStatusAdmin(admin.ModelAdmin):
    list_display = ('project', 'name', 'code', 'order')
    list_filter = ('project',)
    search_fields = ('name', 'code')
