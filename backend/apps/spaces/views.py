from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q

from .models import Space, Page, Sprint, ProjectStatus
from .serializers import SpaceSerializer, PageSerializer, SprintSerializer, ProjectStatusSerializer
from issues.models import Issue

class SpaceViewSet(viewsets.ModelViewSet):
    serializer_class = SpaceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Space.objects.all().order_by('name')
        return Space.objects.filter(
            Q(project__isnull=True) | Q(project__members=user) | Q(project__lead=user)
        ).distinct().order_by('name')

    def perform_create(self, serializer):
        user = self.request.user
        project = serializer.validated_data.get('project')
        
        if project and not project.members.filter(id=user.id).exists() and project.lead != user:
            raise PermissionDenied("You are not a member or lead of this project, so you cannot create a Space for it.")
            
        serializer.save(created_by=user)

    @action(detail=True, methods=['post'])
    def manage_columns(self, request, pk=None):
        space = self.get_object()
        project = space.project

        # Security check: Only project lead or superuser can manage columns
        is_allowed = request.user.is_superuser or (project and request.user == project.lead) or (not project and request.user == space.created_by)
        if not is_allowed:
            raise PermissionDenied("You do not have permission to manage columns for this Space.")

        columns_data = request.data.get('columns', [])
        if not isinstance(columns_data, list):
            return Response({'error': 'columns must be a list.'}, status=status.HTTP_400_BAD_REQUEST)

        existing_ids = [c.get('id') for c in columns_data if c.get('id')]
        
        # Delete columns not in payload
        statuses_to_delete = space.columns.exclude(id__in=existing_ids)
        delete_codes = list(statuses_to_delete.values_list('code', flat=True))
        statuses_to_delete.delete()

        # Fallback deleted status issues to default 'OP'
        if delete_codes:
            Issue.objects.filter(space=space, status__in=delete_codes).update(status='OP')

        # Create/Update columns
        for col in columns_data:
            col_id = col.get('id')
            name = col.get('name', '').strip()
            code = col.get('code', '').strip().upper()
            order = col.get('order', 0)

            if not name or not code:
                continue

            if col_id:
                ProjectStatus.objects.filter(id=col_id, space=space).update(name=name, code=code, order=order)
            else:
                ProjectStatus.objects.get_or_create(space=space, code=code, defaults={'name': name, 'order': order, 'project': project})

        updated_cols = space.columns.all()
        return Response(ProjectStatusSerializer(updated_cols, many=True).data, status=status.HTTP_200_OK)


class PageViewSet(viewsets.ModelViewSet):
    serializer_class = PageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Page.objects.all()
        
        space_id = self.request.query_params.get('space')
        if space_id:
            queryset = queryset.filter(space_id=space_id)
            
        if user.is_superuser:
            return queryset.distinct().order_by('-updated_at')
        return queryset.filter(
            Q(space__project__isnull=True) | Q(space__project__members=user) | Q(space__project__lead=user)
        ).distinct().order_by('-updated_at')

    def perform_create(self, serializer):
        user = self.request.user
        space = serializer.validated_data.get('space')
        
        if space.project and not space.project.members.filter(id=user.id).exists() and space.project.lead != user:
            raise PermissionDenied("You do not have access to this Space.")
            
        serializer.save(created_by=user)


class SprintViewSet(viewsets.ModelViewSet):
    serializer_class = SprintSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        space_id = self.request.query_params.get('space')
        queryset = Sprint.objects.all().annotate(issue_count=Count('issues'))

        if space_id:
            queryset = queryset.filter(space_id=space_id)

        if user.is_superuser:
            return queryset.distinct().order_by('order', 'created_at')
        return queryset.filter(
            Q(space__project__isnull=True) | Q(space__project__members=user) | Q(space__project__lead=user)
        ).distinct().order_by('order', 'created_at')

    def perform_create(self, serializer):
        user = self.request.user
        space = serializer.validated_data.get('space')
        if space.project and not space.project.members.filter(id=user.id).exists() and space.project.lead != user:
            raise PermissionDenied("You do not have access to this Space.")
        serializer.save()

    @action(detail=True, methods=['post'])
    def start_sprint(self, request, pk=None):
        sprint = self.get_object()
        active_exists = Sprint.objects.filter(space=sprint.space, status=Sprint.Status.ACTIVE).exclude(id=sprint.id).exists()
        if active_exists:
            return Response({'error': 'An active sprint already exists in this Space. Please complete it first.'}, status=status.HTTP_400_BAD_REQUEST)
        
        sprint.status = Sprint.Status.ACTIVE
        sprint.save()
        return Response(self.get_serializer(sprint).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def complete_sprint(self, request, pk=None):
        sprint = self.get_object()
        move_to = request.data.get('move_to')

        if sprint.status != Sprint.Status.ACTIVE:
            return Response({'error': 'Only active sprints can be completed.'}, status=status.HTTP_400_BAD_REQUEST)

        sprint.status = Sprint.Status.COMPLETED
        sprint.save()

        unfinished_issues = sprint.issues.exclude(status='CL')

        if move_to == 'backlog':
            unfinished_issues.update(sprint=None)
        elif move_to:
            try:
                target_sprint = Sprint.objects.get(id=int(move_to))
                unfinished_issues.update(sprint=target_sprint)
            except (ValueError, Sprint.DoesNotExist):
                unfinished_issues.update(sprint=None)
        else:
            unfinished_issues.update(sprint=None)

        return Response(self.get_serializer(sprint).data, status=status.HTTP_200_OK)
