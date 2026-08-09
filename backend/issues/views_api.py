from rest_framework import viewsets
from .models import Issue
from .serializers import IssueSerializer
from rest_framework.permissions import IsAuthenticated

class IssueViewSet(viewsets.ModelViewSet):
    queryset = Issue.objects.all().order_by('-created_at')
    serializer_class = IssueSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = self.queryset
        
        # Enforce project membership restriction
        if not user.is_superuser:
            queryset = queryset.filter(project__members=user)
            
        project_id = self.request.query_params.get('project')
        assignee_id = self.request.query_params.get('assignee')
        status_param = self.request.query_params.get('status')
        type_param = self.request.query_params.get('type')
        priority_param = self.request.query_params.get('priority')

        if project_id:
            queryset = queryset.filter(project_id=project_id)
        if assignee_id:
            queryset = queryset.filter(assignee_id=assignee_id)
        if status_param:
            queryset = queryset.filter(status=status_param)
        if type_param:
            queryset = queryset.filter(type=type_param)
        if priority_param:
            queryset = queryset.filter(priority=priority_param)
            
        return queryset

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)
