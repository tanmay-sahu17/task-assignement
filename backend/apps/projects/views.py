from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token

from .models import Project, Invitation, JoinRequest, Space, Page, Sprint
from .serializers import ProjectSerializer, InvitationSerializer, JoinRequestSerializer, SpaceSerializer, PageSerializer, SprintSerializer

User = get_user_model()

class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Project.objects.all().order_by('-created_at')
        return Project.objects.filter(members=user).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        # Only superusers/workspace admins can create projects
        if not request.user.is_superuser:
            raise PermissionDenied("Only Workspace Admins can create projects.")
        return super().create(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def joinable(self, request):
        user = request.user
        if user.is_superuser:
            return Response([])
        projects = Project.objects.exclude(members=user).order_by('-created_at')
        serializer = self.get_serializer(projects, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def manage_members(self, request, pk=None):
        project = self.get_object()
        
        # Security validation check: Only lead or superuser can manage members
        if request.user != project.lead and not request.user.is_superuser:
            raise PermissionDenied("Only the Project Lead or a Superuser can manage members.")

        member_ids = request.data.get('member_ids', [])
        if not isinstance(member_ids, list):
            return Response({'error': 'member_ids must be a list of user IDs.'}, status=status.HTTP_400_BAD_REQUEST)

        # Synchronize members
        project.members.set(member_ids)
        
        # The project lead must ALWAYS be a member of the project
        if project.lead and not project.members.filter(id=project.lead.id).exists():
            project.members.add(project.lead)

        serializer = self.get_serializer(project)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def manage_columns(self, request, pk=None):
        project = self.get_object()
        
        # Security validation check: Only lead or superuser can manage columns
        if request.user != project.lead and not request.user.is_superuser:
            raise PermissionDenied("Only the Project Lead or a Superuser can manage columns.")

        columns_data = request.data.get('columns', [])
        if not isinstance(columns_data, list):
            return Response({'error': 'columns must be a list.'}, status=status.HTTP_400_BAD_REQUEST)

        from .models import ProjectStatus
        from issues.models import Issue

        existing_ids = [c.get('id') for c in columns_data if c.get('id')]
        
        # Delete columns that are not in the payload
        statuses_to_delete = project.columns.exclude(id__in=existing_ids)
        delete_codes = list(statuses_to_delete.values_list('code', flat=True))
        statuses_to_delete.delete()

        # Update issues whose status was deleted to fallback to default 'OP'
        if delete_codes:
            Issue.objects.filter(project=project, status__in=delete_codes).update(status='OP')

        # Create or update columns in payload
        for col in columns_data:
            col_id = col.get('id')
            name = col.get('name', '').strip()
            code = col.get('code', '').strip().upper()
            order = col.get('order', 0)

            if not name or not code:
                continue

            if col_id:
                ProjectStatus.objects.filter(id=col_id, project=project).update(name=name, code=code, order=order)
            else:
                ProjectStatus.objects.get_or_create(project=project, code=code, defaults={'name': name, 'order': order})

        serializer = self.get_serializer(project)
        return Response(serializer.data, status=status.HTTP_200_OK)


class InvitationViewSet(viewsets.ModelViewSet):
    serializer_class = InvitationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Invitation.objects.all().order_by('-created_at')
        # Project leads see invitations for projects they lead
        return Invitation.objects.filter(project__lead=user).order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        project = serializer.validated_data.get('project')
        
        # Security validation check: Only lead of the project or superuser can invite
        if project and user != project.lead and not user.is_superuser:
            raise PermissionDenied("Only the Project Lead or a Superuser can invite team members to this project.")
        elif not project and not user.is_superuser:
            raise PermissionDenied("Only Workspace Admins can send workspace-level invites.")
            
        invite = serializer.save(invited_by=user)

        # Trigger Django send_mail
        from django.core.mail import send_mail
        from django.conf import settings
        
        accept_link = f"http://localhost:5173/accept-invite?token={invite.id}"
        subject = "Invitation to join JiraClone"
        if invite.project:
            message = f"Hello,\n\nYou have been invited to join the project '{invite.project.name}' on JiraClone.\n\nPlease click the link below to accept the invitation and set up your account:\n\n{accept_link}\n\nRegards,\nJiraClone Team"
        else:
            message = f"Hello,\n\nYou have been invited to join our JiraClone workspace.\n\nPlease click the link below to accept the invitation and set up your account:\n\n{accept_link}\n\nRegards,\nJiraClone Team"
            
        send_mail(
            subject=subject,
            message=message,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@jiraclone.com'),
            recipient_list=[invite.email],
            fail_silently=True
        )

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def validate(self, request):
        token_uuid = request.query_params.get('token')
        try:
            invite = Invitation.objects.get(id=token_uuid, accepted=False)
            return Response({
                'id': invite.id,
                'email': invite.email,
                'project_name': invite.project.name if invite.project else None,
                'project_key': invite.project.key if invite.project else None,
            }, status=status.HTTP_200_OK)
        except (Invitation.DoesNotExist, ValueError):
            return Response({'error': 'Invalid or expired invitation token.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def accept(self, request):
        token_uuid = request.data.get('token')
        try:
            invite = Invitation.objects.get(id=token_uuid, accepted=False)
        except (Invitation.DoesNotExist, ValueError):
            return Response({'error': 'Invalid or expired invitation token.'}, status=status.HTTP_400_BAD_REQUEST)

        username = request.data.get('username')
        password = request.data.get('password')
        email = invite.email

        # If user exists, log them in and attach to project
        if User.objects.filter(email=email).exists():
            user = User.objects.get(email=email)
        else:
            if not username or not password:
                return Response({'error': 'Username and password are required to register.'}, status=status.HTTP_400_BAD_REQUEST)
            if User.objects.filter(username=username).exists():
                return Response({'error': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)
            user = User.objects.create_user(username=username, email=email, password=password)

        if invite.project:
            invite.project.members.add(user)

        invite.accepted = True
        invite.save()

        drf_token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': drf_token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_superuser': user.is_superuser,
            }
        }, status=status.HTTP_201_CREATED)


class JoinRequestViewSet(viewsets.ModelViewSet):
    serializer_class = JoinRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return JoinRequest.objects.all().order_by('-created_at')
        
        # Leads see requests for their projects, standard users see their own requests
        # We can union these querysets or perform an OR filter:
        from django.db.models import Q
        return JoinRequest.objects.filter(Q(project__lead=user) | Q(user=user)).distinct().order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        project = serializer.validated_data.get('project')

        if project.members.filter(id=user.id).exists():
            raise ValidationError("You are already a member of this project.")

        if JoinRequest.objects.filter(project=project, user=user, status='PE').exists():
            raise ValidationError("You already have a pending request for this project.")

        serializer.save(user=user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        join_request = self.get_object()
        
        # Security permission check: Only project lead or superuser can approve
        if request.user != join_request.project.lead and not request.user.is_superuser:
            raise PermissionDenied("Only the Project Lead or a Superuser can approve join requests.")

        if join_request.status != 'PE':
            return Response({'error': 'This request has already been processed.'}, status=status.HTTP_400_BAD_REQUEST)

        # Add user to project
        join_request.project.members.add(join_request.user)
        join_request.status = 'AP'
        join_request.save()

        serializer = self.get_serializer(join_request)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        join_request = self.get_object()
        
        # Security permission check: Only project lead or superuser can reject
        if request.user != join_request.project.lead and not request.user.is_superuser:
            raise PermissionDenied("Only the Project Lead or a Superuser can reject join requests.")

        if join_request.status != 'PE':
            return Response({'error': 'This request has already been processed.'}, status=status.HTTP_400_BAD_REQUEST)

        join_request.status = 'RE'
        join_request.save()

        serializer = self.get_serializer(join_request)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SpaceViewSet(viewsets.ModelViewSet):
    serializer_class = SpaceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Space.objects.all().order_by('name')
        
        from django.db.models import Q
        return Space.objects.filter(
            Q(project__isnull=True) | Q(project__members=user)
        ).distinct().order_by('name')

    def perform_create(self, serializer):
        user = self.request.user
        project = serializer.validated_data.get('project')
        
        if project and not project.members.filter(id=user.id).exists() and not user.is_superuser:
            raise PermissionDenied("You are not a member of this project, so you cannot create a Space for it.")
            
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

        from .models import ProjectStatus
        from issues.models import Issue

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

        from .serializers import ProjectStatusSerializer
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
            return queryset.order_by('-updated_at')
            
        from django.db.models import Q
        return queryset.filter(
            Q(space__project__isnull=True) | Q(space__project__members=user)
        ).distinct().order_by('-updated_at')

    def perform_create(self, serializer):
        user = self.request.user
        space = serializer.validated_data.get('space')
        
        if space.project and not space.project.members.filter(id=user.id).exists() and not user.is_superuser:
            raise PermissionDenied("You do not have access to this Space.")
            
        serializer.save(created_by=user)


from django.db.models import Count

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
            return queryset.order_by('order', 'created_at')

        from django.db.models import Q
        return queryset.filter(
            Q(space__project__isnull=True) | Q(space__project__members=user)
        ).distinct().order_by('order', 'created_at')

    def perform_create(self, serializer):
        user = self.request.user
        space = serializer.validated_data.get('space')
        if space.project and not space.project.members.filter(id=user.id).exists() and not user.is_superuser:
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
