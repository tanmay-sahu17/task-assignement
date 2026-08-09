from rest_framework import viewsets, permissions
from .models import Comment
from .serializers import CommentSerializer

class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.user == request.user

class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all().order_by('created')
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        queryset = self.queryset
        issue_id = self.request.query_params.get('issue')
        if issue_id:
            queryset = queryset.filter(issue_id=issue_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
