from django.views.generic.base import TemplateView
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework import status

class HomePage(TemplateView):
    template_name = "home.html"

@api_view(['POST'])
@permission_classes([AllowAny])
def login_api(request):
    username = request.data.get('username')
    password = request.data.get('password')
    if not username or not password:
        return Response({'error': 'Please provide both username and password.'}, status=status.HTTP_400_BAD_REQUEST)
    
    user = authenticate(username=username, password=password)
    if not user:
        return Response({'error': 'Invalid credentials.'}, status=status.HTTP_400_BAD_REQUEST)
        
    token, created = Token.objects.get_or_create(user=user)
    return Response({
        'token': token.key,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_superuser': user.is_superuser,
            'avatar_color': user.profile.avatar_color if hasattr(user, 'profile') else '#4f46e5',
        }
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_api(request):
    try:
        request.user.auth_token.delete()
        return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_api(request):
    return Response({
        'id': request.user.id,
        'username': request.user.username,
        'email': request.user.email,
        'is_superuser': request.user.is_superuser,
        'avatar_color': request.user.profile.avatar_color if hasattr(request.user, 'profile') else '#4f46e5',
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def users_list_api(request):
    users = User.objects.all().values('id', 'username', 'email')
    return Response(list(users))

@api_view(['POST'])
@permission_classes([AllowAny])
def register_api(request):
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not username or not password or not email:
        return Response({'error': 'Please provide username, email, and password.'}, status=status.HTTP_400_BAD_REQUEST)
        
    if User.objects.filter(username=username).exists():
        return Response({'error': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)
        
    if User.objects.filter(email=email).exists():
        return Response({'error': 'Email already registered.'}, status=status.HTTP_400_BAD_REQUEST)
        
    user = User.objects.create_user(username=username, email=email, password=password)
    token, created = Token.objects.get_or_create(user=user)
    
    return Response({
        'token': token.key,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'avatar_color': user.profile.avatar_color if hasattr(user, 'profile') else '#4f46e5',
        }
    }, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def profile_api(request):
    from projects.models import UserProfile
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    if request.method == 'GET':
        return Response({
            'username': request.user.username,
            'email': request.user.email,
            'first_name': profile.first_name,
            'last_name': profile.last_name,
            'job_title': profile.job_title,
            'department': profile.department,
            'bio': profile.bio,
            'avatar_color': profile.avatar_color,
            'phone': profile.phone,
            'location': profile.location,
        })
        
    elif request.method in ['PUT', 'PATCH']:
        user = request.user
        email = request.data.get('email')
        if email:
            if User.objects.filter(email=email).exclude(pk=user.pk).exists():
                return Response({'error': 'Email is already registered by another user.'}, status=status.HTTP_400_BAD_REQUEST)
            user.email = email
            user.save()
            
        profile.first_name = request.data.get('first_name', profile.first_name)
        profile.last_name = request.data.get('last_name', profile.last_name)
        profile.job_title = request.data.get('job_title', profile.job_title)
        profile.department = request.data.get('department', profile.department)
        profile.bio = request.data.get('bio', profile.bio)
        profile.avatar_color = request.data.get('avatar_color', profile.avatar_color)
        profile.phone = request.data.get('phone', profile.phone)
        profile.location = request.data.get('location', profile.location)
        profile.save()
        
        return Response({
            'message': 'Profile updated successfully.',
            'profile': {
                'username': user.username,
                'email': user.email,
                'first_name': profile.first_name,
                'last_name': profile.last_name,
                'job_title': profile.job_title,
                'department': profile.department,
                'bio': profile.bio,
                'avatar_color': profile.avatar_color,
                'phone': profile.phone,
                'location': profile.location,
            }
        })