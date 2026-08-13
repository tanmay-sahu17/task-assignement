from rest_framework import serializers
from .models import Comment
from projects.serializers import UserSerializer

class CommentSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)

    class Meta:
        model = Comment
        fields = ('id', 'content', 'issue', 'user', 'user_details', 'created', 'modified')
        read_only_fields = ('user', 'created', 'modified')
