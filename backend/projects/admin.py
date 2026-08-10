from django.contrib import admin
from .models import Project, Invitation, JoinRequest, ProjectStatus

class ProjectStatusInline(admin.TabularInline):
    model = ProjectStatus
    extra = 1

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'key', 'lead', 'created_at')
    search_fields = ('name', 'key')
    filter_horizontal = ('members',)
    inlines = [ProjectStatusInline]

@admin.register(ProjectStatus)
class ProjectStatusAdmin(admin.ModelAdmin):
    list_display = ('project', 'name', 'code', 'order')
    list_filter = ('project',)
    search_fields = ('name', 'code')

@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ('id', 'email', 'project', 'invited_by', 'accepted', 'created_at')
    list_filter = ('accepted', 'created_at')
    search_fields = ('email',)

@admin.register(JoinRequest)
class JoinRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'project', 'user', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('user__username', 'project__name')


from .models import Space, Page

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


from .models import UserProfile

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'job_title', 'department', 'location')
    search_fields = ('user__username', 'user__email', 'job_title')

