from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework.authtoken.models import Token
from django.core.mail import send_mail
from django.conf import settings

from .models import Project, Invitation, JoinRequest
from .serializers import ProjectSerializer, InvitationSerializer, JoinRequestSerializer

User = get_user_model()

class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Project.objects.filter(Q(lead=user) | Q(members=user)).distinct().order_by('-created_at')

    def create(self, request, *args, **kwargs):
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
        
        if request.user != project.lead and not request.user.is_superuser:
            raise PermissionDenied("Only the Project Lead or a Superuser can manage members.")

        member_ids = request.data.get('member_ids', [])
        if not isinstance(member_ids, list):
            return Response({'error': 'member_ids must be a list of user IDs.'}, status=status.HTTP_400_BAD_REQUEST)

        project.members.set(member_ids)
        
        if project.lead and not project.members.filter(id=project.lead.id).exists():
            project.members.add(project.lead)

        serializer = self.get_serializer(project)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def manage_columns(self, request, pk=None):
        project = self.get_object()
        
        if request.user != project.lead and not request.user.is_superuser:
            raise PermissionDenied("Only the Project Lead or a Superuser can manage columns.")

        columns_data = request.data.get('columns', [])
        if not isinstance(columns_data, list):
            return Response({'error': 'columns must be a list.'}, status=status.HTTP_400_BAD_REQUEST)

        from spaces.models import ProjectStatus
        from issues.models import Issue

        existing_ids = [c.get('id') for c in columns_data if c.get('id')]
        
        statuses_to_delete = project.columns.exclude(id__in=existing_ids)
        delete_codes = list(statuses_to_delete.values_list('code', flat=True))
        statuses_to_delete.delete()

        if delete_codes:
            Issue.objects.filter(project=project, status__in=delete_codes).update(status='OP')

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
        return Invitation.objects.filter(Q(project__lead=user) | Q(email=user.email)).distinct().order_by('-created_at')

    @action(detail=True, methods=['post'])
    def accept_invite(self, request, pk=None):
        invite = self.get_object()
        if invite.email != request.user.email:
            raise PermissionDenied("This invitation is not for you.")
            
        if invite.accepted:
            return Response({'error': 'Invitation already accepted.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if invite.project:
            invite.project.members.add(request.user)
            
        invite.accepted = True
        invite.save()
        return Response({'message': 'Invitation accepted successfully.'}, status=status.HTTP_200_OK)
        
    @action(detail=True, methods=['post'])
    def decline_invite(self, request, pk=None):
        invite = self.get_object()
        if invite.email != request.user.email:
            raise PermissionDenied("This invitation is not for you.")
            
        if invite.accepted:
            return Response({'error': 'Invitation already accepted.'}, status=status.HTTP_400_BAD_REQUEST)
            
        invite.delete()
        return Response({'message': 'Invitation declined successfully.'}, status=status.HTTP_200_OK)

    def perform_create(self, serializer):
        user = self.request.user
        project = serializer.validated_data.get('project')
        
        if project and user != project.lead and not user.is_superuser:
            raise PermissionDenied("Only the Project Lead or a Superuser can invite team members to this project.")
        elif not project and not user.is_superuser:
            raise PermissionDenied("Only Workspace Admins can send workspace-level invites.")
            
        invite = serializer.save(invited_by=user)

        existing_user = User.objects.filter(email=invite.email).first()
        if existing_user:
            from notifications.helpers import send_push_notification
            project_name = invite.project.name if invite.project else "Workspace"
            title = "New Project Invitation" if invite.project else "New Workspace Invitation"
            body = f"You have been invited to join '{project_name}' by {user.username}. Click to review."
            link = "/projects"
            send_push_notification(
                user=existing_user,
                title=title,
                body=body,
                link=link,
                actor=user
            )

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
        
        if request.user != join_request.project.lead and not request.user.is_superuser:
            raise PermissionDenied("Only the Project Lead or a Superuser can approve join requests.")

        if join_request.status != 'PE':
            return Response({'error': 'This request has already been processed.'}, status=status.HTTP_400_BAD_REQUEST)

        join_request.project.members.add(join_request.user)
        join_request.status = 'AP'
        join_request.save()

        serializer = self.get_serializer(join_request)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        join_request = self.get_object()
        
        if request.user != join_request.project.lead and not request.user.is_superuser:
            raise PermissionDenied("Only the Project Lead or a Superuser can reject join requests.")

        if join_request.status != 'PE':
            return Response({'error': 'This request has already been processed.'}, status=status.HTTP_400_BAD_REQUEST)

        join_request.status = 'RE'
        join_request.save()

        serializer = self.get_serializer(join_request)
        return Response(serializer.data, status=status.HTTP_200_OK)
