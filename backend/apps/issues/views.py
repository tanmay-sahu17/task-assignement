from rest_framework import viewsets
from .models import Issue, IssueLink, IssueAttachment
from .serializers import IssueSerializer, IssueLinkSerializer, IssueAttachmentSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

class IssueViewSet(viewsets.ModelViewSet):
    queryset = Issue.objects.all().order_by('-created_at')
    serializer_class = IssueSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = self.queryset
        
        # Enforce project membership/lead restriction
        from django.db.models import Q
        queryset = queryset.filter(Q(project__members=user) | Q(project__lead=user)).distinct()
            
        project_id = self.request.query_params.get('project')
        space_id = self.request.query_params.get('space')
        sprint_param = self.request.query_params.get('sprint')
        assignee_id = self.request.query_params.get('assignee')
        status_param = self.request.query_params.get('status')
        type_param = self.request.query_params.get('type')
        priority_param = self.request.query_params.get('priority')

        if project_id:
            queryset = queryset.filter(project_id=project_id)
        if space_id:
            queryset = queryset.filter(space_id=space_id)
        if sprint_param:
            if sprint_param == 'none':
                queryset = queryset.filter(sprint__isnull=True)
            else:
                queryset = queryset.filter(sprint_id=sprint_param)
        if assignee_id:
            queryset = queryset.filter(assignee_id=assignee_id)
        if status_param:
            queryset = queryset.filter(status=status_param)
        if type_param:
            queryset = queryset.filter(type=type_param)
        if priority_param:
            queryset = queryset.filter(priority=priority_param)
            
        recent_param = self.request.query_params.get('recent')
        if recent_param == 'true':
            from django.db.models import Q
            queryset = queryset.filter(
                Q(assignee=user) | 
                Q(reporter=user) | 
                Q(comments__user=user)
            ).distinct()
            
        return queryset

    def perform_create(self, serializer):
        space = serializer.validated_data.get('space')
        if space:
            serializer.save(reporter=self.request.user, project=space.project)
        else:
            serializer.save(reporter=self.request.user)


class IssueLinkViewSet(viewsets.ModelViewSet):
    queryset = IssueLink.objects.all()
    serializer_class = IssueLinkSerializer
    permission_classes = [IsAuthenticated]


class IssueAttachmentViewSet(viewsets.ModelViewSet):
    queryset = IssueAttachment.objects.all()
    serializer_class = IssueAttachmentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def perform_create(self, serializer):
        uploaded_file = self.request.data.get('file')
        filename = uploaded_file.name if uploaded_file else "attachment"
        serializer.save(uploaded_by=self.request.user, filename=filename)


