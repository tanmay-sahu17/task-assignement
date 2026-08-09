from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Project, Invitation, JoinRequest, Space, Page

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email')

class ProjectSerializer(serializers.ModelSerializer):
    lead_details = UserSerializer(source='lead', read_only=True)
    members_details = UserSerializer(source='members', many=True, read_only=True)

    class Meta:
        model = Project
        fields = ('id', 'name', 'key', 'description', 'lead', 'lead_details', 'members', 'members_details', 'created_at')

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


class PageSerializer(serializers.ModelSerializer):
    created_by_details = UserSerializer(source='created_by', read_only=True)

    class Meta:
        model = Page
        fields = ('id', 'space', 'title', 'content', 'created_by', 'created_by_details', 'created_at', 'updated_at')
        read_only_fields = ('created_by',)


class SpaceSerializer(serializers.ModelSerializer):
    created_by_details = UserSerializer(source='created_by', read_only=True)
    project_details = ProjectSerializer(source='project', read_only=True)
    pages = PageSerializer(many=True, read_only=True)

    class Meta:
        model = Space
        fields = ('id', 'name', 'key', 'project', 'project_details', 'created_by', 'created_by_details', 'pages', 'created_at')
        read_only_fields = ('created_by',)
