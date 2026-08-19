from django.urls import path
from .views import login_api, logout_api, me_api, users_list_api, register_api, profile_api, google_login_api

urlpatterns = [
    path('login/', login_api, name='login_api'),
    path('logout/', logout_api, name='logout_api'),
    path('me/', me_api, name='me_api'),
    path('users/', users_list_api, name='users_list_api'),
    path('register/', register_api, name='register_api'),
    path('profile/', profile_api, name='profile_api'),
    path('google-login/', google_login_api, name='google_login_api'),
]
