"""jiraClone URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from projects.views import ProjectViewSet, InvitationViewSet, JoinRequestViewSet, SpaceViewSet, PageViewSet, SprintViewSet
from issues.views import IssueViewSet
from comments.views import CommentViewSet
from . import views

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'issues', IssueViewSet, basename='issue')
router.register(r'comments', CommentViewSet, basename='comment')
router.register(r'invitations', InvitationViewSet, basename='invitation')
router.register(r'join-requests', JoinRequestViewSet, basename='join-request')
router.register(r'spaces', SpaceViewSet, basename='space')
router.register(r'pages', PageViewSet, basename='page')
router.register(r'sprints', SprintViewSet, basename='sprint')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('allauth.urls')),
    path('', views.HomePage.as_view(), name='home'),
    path('issues/', include('issues.urls', namespace='issues')),
    
    # Auth and User API endpoints
    path('api/auth/login/', views.login_api, name='api_login'),
    path('api/auth/register/', views.register_api, name='api_register'),
    path('api/auth/logout/', views.logout_api, name='api_logout'),
    path('api/auth/me/', views.me_api, name='api_me'),
    path('api/users/', views.users_list_api, name='api_users'),
    path('api/profile/', views.profile_api, name='api_profile'),


    # REST Framework ViewSets API endpoints
    path('api/', include(router.urls)),
]
