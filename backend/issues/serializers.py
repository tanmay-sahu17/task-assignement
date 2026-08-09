from rest_framework import serializers
from .models import Issue
from projects.serializers import UserSerializer, ProjectSerializer

class IssueSerializer(serializers.ModelSerializer):
    reporter_details = UserSerializer(source='reporter', read_only=True)
    assignee_details = UserSerializer(source='assignee', read_only=True)
    project_details = ProjectSerializer(source='project', read_only=True)

    type_display = serializers.CharField(source='get_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)

    class Meta:
        model = Issue
        fields = (
            'issue_no', 'project', 'project_details', 'reporter', 'reporter_details', 
            'assignee', 'assignee_details', 'title', 'details', 'type', 'type_display',
            'status', 'status_display', 'priority', 'priority_display', 'label', 'created_at'
        )
        read_only_fields = ('reporter',)

    def validate(self, attrs):
        project = attrs.get('project')
        assignee = attrs.get('assignee')

        # During partial updates, get project from instance if not provided in payload
        if not project and self.instance:
            project = self.instance.project

        # If assignee is set, validate they are a project member
        if assignee and project:
            if not project.members.filter(id=assignee.id).exists():
                raise serializers.ValidationError({"assignee": "Assignee must be a member of this project."})

        return attrs
