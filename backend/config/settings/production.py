from .base import *

DEBUG = False

# Set ALLOWED_HOSTS for production safely
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['yourdomain.com'])

# Set secure headers
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = 'DENY'
