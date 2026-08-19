from django.db.models import Count, Sum
from django.utils import timezone
from datetime import timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import FCMDevice, Notification
from issues.models import Issue
from projects.models import Project
from spaces.models import Sprint, Space

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_fcm_token_api(request):
    token = request.data.get('registration_token')
    action = request.data.get('action', 'register')
    
    if not token:
        return Response({'error': 'registration_token is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
    if action == 'register':
        device, created = FCMDevice.objects.get_or_create(
            registration_token=token,
            defaults={'user': request.user}
        )
        if not created and device.user != request.user:
            device.user = request.user
            device.save()
        return Response({'message': 'FCM token registered successfully.'}, status=status.HTTP_200_OK)
        
    elif action == 'unregister':
        FCMDevice.objects.filter(registration_token=token, user=request.user).delete()
        return Response({'message': 'FCM token unregistered successfully.'}, status=status.HTTP_200_OK)
        
    return Response({'error': 'Invalid action.'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def notifications_api(request):
    if request.method == 'GET':
        notifications = Notification.objects.filter(recipient=request.user)
        unread_only = request.query_params.get('unread_only', 'false') == 'true'
        if unread_only:
            notifications = notifications.filter(is_read=False)
            
        data = []
        for n in notifications[:50]:  # Limit to 50 recent notifications
            data.append({
                'id': n.id,
                'title': n.title,
                'description': n.description,
                'link': n.link,
                'is_read': n.is_read,
                'created_at': n.created_at.isoformat(),
                'actor': n.actor.username if n.actor else 'System'
            })
            
        unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({
            'notifications': data,
            'unread_count': unread_count
        }, status=status.HTTP_200_OK)
        
    elif request.method == 'POST':
        # Mark as read
        notification_ids = request.data.get('notification_ids', [])
        mark_all = request.data.get('mark_all', False)
        
        if mark_all:
            Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
            return Response({'message': 'All notifications marked as read.'}, status=status.HTTP_200_OK)
            
        if not notification_ids:
            return Response({'error': 'notification_ids or mark_all is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        Notification.objects.filter(id__in=notification_ids, recipient=request.user).update(is_read=True)
        return Response({'message': 'Notifications marked as read.'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_analytics_api(request):
    project_id = request.query_params.get('project_id')
    
    issues_qs = Issue.objects.filter(space__project__members=request.user)
    if project_id:
        issues_qs = issues_qs.filter(space__project_id=project_id)
        
    # 2. Status Split Data
    status_counts = issues_qs.values('status').annotate(count=Count('issue_no'))
    status_data = []
    status_map = {
        'OP': 'Open',
        'IN': 'In Progress',
        'CL': 'Closed'
    }
    for item in status_counts:
        status_data.append({
            'name': status_map.get(item['status'], item['status']),
            'value': item['count']
        })
        
    # 3. Priority Split Data
    priority_counts = issues_qs.values('priority').annotate(count=Count('issue_no'))
    priority_data = []
    priority_map = {
        'LO': 'Low',
        'ME': 'Medium',
        'HI': 'High',
        'CR': 'Critical'
    }
    for item in priority_counts:
        priority_data.append({
            'name': priority_map.get(item['priority'], item['priority']),
            'value': item['count']
        })
        
    # 4. Sprint Velocity
    sprints = Sprint.objects.filter(space__project__members=request.user)
    if project_id:
        sprints = sprints.filter(space__project_id=project_id)
    sprints = sprints.order_by('-start_date')[:5]
    
    velocity_data = []
    for s in reversed(sprints):
        completed_sp = Issue.objects.filter(sprint=s, status='CL').aggregate(total_sp=Sum('story_points'))['total_sp'] or 0
        total_sp = Issue.objects.filter(sprint=s).aggregate(total_sp=Sum('story_points'))['total_sp'] or 0
        velocity_data.append({
            'sprint_name': s.name,
            'completed_sp': completed_sp,
            'total_sp': total_sp
        })
        
    # 5. Burndown Chart Data (for active sprint)
    active_sprint = Sprint.objects.filter(space__project__members=request.user, status='AC')
    if project_id:
        active_sprint = active_sprint.filter(space__project_id=project_id)
    active_sprint = active_sprint.first()
    
    burndown_data = []
    if active_sprint and active_sprint.start_date and active_sprint.end_date:
        start_date = active_sprint.start_date
        end_date = active_sprint.end_date
        sprint_days = (end_date - start_date).days + 1
        
        sprint_issues = Issue.objects.filter(sprint=active_sprint)
        total_sprint_points = sprint_issues.aggregate(total_sp=Sum('story_points'))['total_sp'] or 0
        
        ideal_decrement = total_sprint_points / max(1, (sprint_days - 1))
        
        for day_idx in range(sprint_days):
            current_day = start_date + timedelta(days=day_idx)
            completed_on_day = sprint_issues.filter(status='CL', due_date__lte=current_day).aggregate(sum_sp=Sum('story_points'))['sum_sp'] or 0
            is_future_day = current_day > timezone.now().date()
            
            burndown_data.append({
                'day': current_day.strftime('%b %d'),
                'ideal': max(0, round(total_sprint_points - (day_idx * ideal_decrement), 1)),
                'actual': None if is_future_day else max(0, total_sprint_points - completed_on_day)
            })
            
    return Response({
        'status_data': status_data,
        'priority_data': priority_data,
        'velocity_data': velocity_data,
        'burndown_data': burndown_data,
        'has_active_sprint': active_sprint is not None,
        'active_sprint_name': active_sprint.name if active_sprint else ''
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def global_search_api(request):
    query = request.query_params.get('q', '').strip()
    if not query or len(query) < 2:
        return Response({
            'projects': [],
            'spaces': [],
            'issues': []
        }, status=status.HTTP_200_OK)
        
    user = request.user
    
    projects = Project.objects.filter(members=user, name__icontains=query) | Project.objects.filter(members=user, key__icontains=query)
    projects = projects.distinct()
    
    spaces = Space.objects.filter(project__members=user, name__icontains=query) | Space.objects.filter(project__members=user, key__icontains=query)
    spaces = spaces.distinct()
    
    issues = Issue.objects.filter(space__project__members=user)
    if query.isdigit():
        issues = issues.filter(issue_no=int(query))
    else:
        issues = issues.filter(title__icontains=query) | issues.filter(details__icontains=query)
    issues = issues.distinct()
    
    projects_data = [{'id': p.id, 'name': p.name, 'key': p.key} for p in projects[:10]]
    spaces_data = [{'id': s.id, 'name': s.name, 'key': s.key, 'project_id': s.project.id if s.project else None} for s in spaces[:10]]
    
    issues_data = []
    for i in issues[:15]:
        issues_data.append({
            'issue_no': i.issue_no,
            'title': i.title,
            'status': i.status,
            'priority': i.priority,
            'space_id': i.space.id if i.space else None,
            'space_name': i.space.name if i.space else ''
        })
        
    return Response({
        'projects': projects_data,
        'spaces': spaces_data,
        'issues': issues_data
    }, status=status.HTTP_200_OK)


