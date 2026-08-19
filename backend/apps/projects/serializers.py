from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Project, Invitation, JoinRequest
from spaces.serializers import ProjectStatusSerializer

class UserSerializer(serializers.ModelSerializer):
    avatar_color = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'avatar_color')

    def get_avatar_color(self, obj):
        return obj.profile.avatar_color if hasattr(obj, 'profile') else '#4f46e5'

class ProjectSerializer(serializers.ModelSerializer):
    lead_details = UserSerializer(source='lead', read_only=True)
    members_details = UserSerializer(source='members', many=True, read_only=True)
    statuses = ProjectStatusSerializer(source='columns', many=True, read_only=True)

    class Meta:
        model = Project
        fields = ('id', 'name', 'key', 'description', 'lead', 'lead_details', 'members', 'members_details', 'statuses', 'created_at')

class InvitationSerializer(serializers.ModelSerializer):
    invited_by_details = UserSerializer(source='invited_by', read_only=True)
    project_details = ProjectSerializer(source='project', read_only=True)

    class Meta:
        model = Invitation
        fields = ('id', 'email', 'project', 'project_details', 'invited_by', 'invited_by_details', 'accepted', 'created_at')
        read_only_fields = ('invited_by', 'accepted')

class JoinRequestSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    project_details = ProjectSerializer(source='project', read_only=True)

    class Meta:
        model = JoinRequest
        fields = ('id', 'project', 'project_details', 'user', 'user_details', 'status', 'created_at')
        read_only_fields = ('user', 'status')
