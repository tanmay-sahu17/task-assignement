from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Space, Page, ProjectStatus, Sprint
from accounts.serializers import UserSerializer

class ProjectStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectStatus
        fields = ('id', 'name', 'code', 'order')

class PageSerializer(serializers.ModelSerializer):
    created_by_details = UserSerializer(source='created_by', read_only=True)

    class Meta:
        model = Page
        fields = ('id', 'space', 'title', 'content', 'created_by', 'created_by_details', 'created_at', 'updated_at')
        read_only_fields = ('created_by',)

class SpaceSerializer(serializers.ModelSerializer):
    created_by_details = UserSerializer(source='created_by', read_only=True)
    project_details = serializers.SerializerMethodField()
    pages = PageSerializer(many=True, read_only=True)
    statuses = ProjectStatusSerializer(source='columns', many=True, read_only=True)

    class Meta:
        model = Space
        fields = ('id', 'name', 'key', 'description', 'project', 'project_details', 'created_by', 'created_by_details', 'pages', 'statuses', 'created_at')
        read_only_fields = ('created_by',)

    def get_project_details(self, obj):
        if not obj.project:
            return None
        from projects.serializers import ProjectSerializer
        return ProjectSerializer(obj.project, context=self.context).data

class SprintSerializer(serializers.ModelSerializer):
    issue_count = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Sprint
        fields = ('id', 'space', 'name', 'goal', 'status', 'status_display', 'start_date', 'end_date', 'order', 'issue_count', 'created_at')
