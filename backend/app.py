import sys
import os

# Garantizar que el directorio 'backend' esté en sys.path
# Esto es necesario para que gunicorn encuentre todos los módulos en Render
_backend_dir = os.path.dirname(os.path.abspath(__file__))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from flask import Flask, jsonify, send_from_directory
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

# Inicializar extensiones
bcrypt = Bcrypt()

def create_app():
    """Factory para crear la aplicación Flask"""
    
    # Calcular path al frontend (una carpeta arriba del backend)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(base_dir, '..', 'frontend')
    
    app = Flask(__name__, static_folder=None)
    
    # Cargar configuración
    app.config.from_object('config.Config')
    
    # Inicializar extensiones
    bcrypt.init_app(app)
    # CORS: la lista de orígenes vive en config.py
    CORS(app, origins=app.config['CORS_ORIGINS'], supports_credentials=True)
    
    # Crear directorios necesarios
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['EXPORT_FOLDER'], exist_ok=True)
    
    # Registrar blueprints
    from routes.auth import auth_bp
    from routes.usuarios import usuarios_bp
    from routes.proveedores import proveedores_bp
    from routes.articulos import articulos_bp
    from routes.listas_precios import listas_precios_bp
    from routes.competencia import competencia_bp
    from routes.ordenes_compra import ordenes_compra_bp
    from routes.upload import upload_bp
    from routes.dashboard import dashboard_bp
    from routes.export import export_bp
    from routes.matching import matching_bp
    from routes.planificacion import planificacion_bp
    from routes.notifications import notifications_bp
    from routes.audit import audit_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(usuarios_bp, url_prefix='/api/usuarios')
    app.register_blueprint(proveedores_bp, url_prefix='/api/proveedores')
    app.register_blueprint(articulos_bp, url_prefix='/api/articulos')
    app.register_blueprint(listas_precios_bp, url_prefix='/api/listas-precios')
    app.register_blueprint(competencia_bp, url_prefix='/api/competencia')
    app.register_blueprint(ordenes_compra_bp, url_prefix='/api/ordenes-compra')
    app.register_blueprint(upload_bp, url_prefix='/api/upload')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(export_bp, url_prefix='/api/export')
    app.register_blueprint(matching_bp, url_prefix='/api/matching')
    app.register_blueprint(planificacion_bp, url_prefix='/api/planificacion')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(audit_bp, url_prefix='/api/audit')
    
    # Ruta de healthcheck
    @app.route('/api/health')
    def health():
        return {'status': 'ok', 'message': 'API funcionando correctamente'}

    # Errores no controlados: responder JSON en lugar de HTML de Flask
    @app.errorhandler(Exception)
    def handle_unexpected_error(e):
        if isinstance(e, HTTPException):
            return jsonify({'error': e.description}), e.code
        app.logger.exception('Error no controlado')
        return jsonify({'error': 'Error interno del servidor'}), 500
    
    # Servir el frontend estático desde el mismo servidor
    # Así la app y la API están en el mismo origen: http://localhost:3000
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        if path and os.path.exists(os.path.join(frontend_dir, path)):
            return send_from_directory(frontend_dir, path)
        return send_from_directory(frontend_dir, 'index.html')
    
    return app

# Exponer 'app' a nivel de módulo para gunicorn (Render)
app = create_app()

# Inicializar DB al primer arranque
with app.app_context():
    try:
        from database.db import init_database
        init_database()
    except Exception as e:
        print(f'DB ya inicializada o error: {e}')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 3000)), debug=os.getenv('FLASK_ENV') != 'production')


