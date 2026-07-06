import os
from dotenv import load_dotenv

load_dotenv()

# En Render se setea FLASK_ENV=production (ver render.yaml)
IS_PRODUCTION = os.getenv('FLASK_ENV') == 'production'


class Config:
    """Configuración base de la aplicación"""

    # Clave secreta para firmar las cookies de sesión
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

    # Sesiones
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    # En producción (HTTPS) la cookie solo viaja cifrada
    SESSION_COOKIE_SECURE = IS_PRODUCTION
    PERMANENT_SESSION_LIFETIME = 60 * 60 * 8  # 8 horas

    # CORS: orígenes locales de desarrollo + URL pública de Render si existe
    CORS_ORIGINS = [
        'http://localhost:3000', 'http://127.0.0.1:3000',
        'http://localhost:5500', 'http://127.0.0.1:5500',
        'http://localhost:5173', 'http://127.0.0.1:5173',
    ]
    _render_url = os.getenv('RENDER_EXTERNAL_URL')
    if _render_url:
        CORS_ORIGINS.append(_render_url)

    # Uploads
    UPLOAD_FOLDER = 'uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    ALLOWED_EXTENSIONS = {'pdf', 'xlsx', 'xls', 'csv'}

    # Exports
    EXPORT_FOLDER = 'exports'
