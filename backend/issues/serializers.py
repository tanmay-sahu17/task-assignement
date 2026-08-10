from rest_framework import serializers
from .models import Issue
from projects.serializers import UserSerializer, ProjectSerializer, SpaceSerializer

class EpicDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Issue
        fields = ('issue_no', 'title', 'label')

class ChildIssueSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    status_display = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Issue
        fields = ('issue_no', 'title', 'type', 'type_display', 'status', 'status_display', 'priority')

    def get_status_display(self, obj):
        if obj.project:
            status_obj = obj.project.columns.filter(code=obj.status).first()
            if status_obj:
                return status_obj.name
        return obj.get_status_display()

class IssueSerializer(serializers.ModelSerializer):
    reporter_details = UserSerializer(source='reporter', read_only=True)
    assignee_details = UserSerializer(source='assignee', read_only=True)
    project_details = ProjectSerializer(source='project', read_only=True)
    space_details = SpaceSerializer(source='space', read_only=True)

    type_display = serializers.CharField(source='get_type_display', read_only=True)
    status_display = serializers.SerializerMethodField(read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    
    epic_details = EpicDetailsSerializer(source='epic', read_only=True)
    child_issues_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Issue
        fields = (
            'issue_no', 'project', 'project_details', 'space', 'space_details',
            'reporter', 'reporter_details', 'assignee', 'assignee_details', 
            'title', 'details', 'type', 'type_display', 'status', 'status_display', 
            'priority', 'priority_display', 'label', 'created_at', 'epic', 
            'epic_details', 'start_date', 'due_date', 'child_issues_details'
        )
        read_only_fields = ('reporter',)

    def get_child_issues_details(self, obj):
        if obj.type == 'EP':
            children = obj.child_issues.all().order_by('created_at')
            return ChildIssueSerializer(children, many=True).data
        return []

    def get_status_display(self, obj):
        if obj.project:
            status_obj = obj.project.columns.filter(code=obj.status).first()
            if status_obj:
                return status_obj.name
        return obj.get_status_display()


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
