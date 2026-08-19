from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from projects.views import ProjectViewSet, InvitationViewSet, JoinRequestViewSet
from spaces.views import SpaceViewSet, PageViewSet, SprintViewSet
from issues.views import IssueViewSet, IssueLinkViewSet, IssueAttachmentViewSet
from comments.views import CommentViewSet
from notifications.views import register_fcm_token_api, notifications_api, dashboard_analytics_api, global_search_api
from accounts import views as accounts_views
from config import views as config_views

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'issues', IssueViewSet, basename='issue')
router.register(r'comments', CommentViewSet, basename='comment')
router.register(r'invitations', InvitationViewSet, basename='invitation')
router.register(r'join-requests', JoinRequestViewSet, basename='join-request')
router.register(r'spaces', SpaceViewSet, basename='space')
router.register(r'issue-links', IssueLinkViewSet, basename='issue-link')
router.register(r'attachments', IssueAttachmentViewSet, basename='attachment')
router.register(r'pages', PageViewSet, basename='page')
router.register(r'sprints', SprintViewSet, basename='sprint')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('allauth.urls')),
    path('', config_views.HomePage.as_view(), name='home'),
    path('issues/', include('issues.urls', namespace='issues')),
    
    # Auth and User API endpoints (routed from accounts app)
    path('api/auth/login/', accounts_views.login_api, name='api_login'),
    path('api/auth/register/', accounts_views.register_api, name='api_register'),
    path('api/auth/google/', accounts_views.google_login_api, name='api_google_login'),
    path('api/auth/logout/', accounts_views.logout_api, name='api_logout'),
    path('api/auth/me/', accounts_views.me_api, name='api_me'),
    path('api/users/', accounts_views.users_list_api, name='api_users'),
    path('api/profile/', accounts_views.profile_api, name='api_profile'),

    # Notifications API endpoints
    path('api/notifications/register/', register_fcm_token_api, name='api_register_fcm_token'),
    path('api/notifications/', notifications_api, name='api_notifications'),
    path('api/analytics/dashboard/', dashboard_analytics_api, name='api_dashboard_analytics'),
    path('api/search/', global_search_api, name='api_global_search'),

    # REST Framework ViewSets API endpoints
    path('api/', include(router.urls)),
]
