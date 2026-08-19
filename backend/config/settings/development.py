from .base import *

# CORS Allowed Origins
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5175',
])

# Database
if env.str('DATABASE_URL', default=''):
    DATABASES = {
        'default': env.db_url('DATABASE_URL')
    }
else:
    db_engine = env.str('DB_ENGINE', default='postgresql')
    if db_engine == 'mysql':
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.mysql',
                'NAME': env.str('DB_NAME', default='task_manager'),
                'USER': env.str('DB_USER', default='root'),
                'PASSWORD': env.str('DB_PASSWORD', default=''),
                'HOST': env.str('DB_HOST', default='127.0.0.1'),
                'PORT': env.str('DB_PORT', default='3306'),
                'OPTIONS': {
                    'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
                }
            }
        }
    else:
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': env.str('DB_NAME', default='task_manager'),
                'USER': env.str('DB_USER', default='postgres'),
                'PASSWORD': env.str('DB_PASSWORD', default=''),
                'HOST': env.str('DB_HOST', default='127.0.0.1'),
                'PORT': env.str('DB_PORT', default='5432'),
            }
        }

# Email configurations
EMAIL_BACKEND = env.str('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = env.str('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = env.int('EMAIL_PORT', default=587)
EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=True)
EMAIL_HOST_USER = env.str('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env.str('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = env.str('DEFAULT_FROM_EMAIL', default='JiraClone <your-email@gmail.com>')

# Firebase Admin SDK Initialization
import firebase_admin
from firebase_admin import credentials

firebase_creds_path = env.str('FIREBASE_CREDENTIALS_PATH', default='')
if firebase_creds_path:
    if not os.path.isabs(firebase_creds_path):
        firebase_creds_path = os.path.join(BASE_DIR, firebase_creds_path)
    if os.path.exists(firebase_creds_path):
        try:
            cred = credentials.Certificate(firebase_creds_path)
            firebase_admin.initialize_app(cred)
        except Exception as e:
            print(f"Error initializing Firebase Admin SDK: {e}")
    else:
        print(f"Firebase credentials file not found at: {firebase_creds_path}")
