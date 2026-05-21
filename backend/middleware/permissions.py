"""Middleware simple para verificar permisos."""

from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity
import sqlite3
import os


def get_db():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_path = os.path.join(base_dir, 'database', 'gestion_compras.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def require_permission(modulo, accion):
    """Decorador para verificar permisos."""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user_id = get_jwt_identity()
            
            # Obtener rol del usuario
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT rol FROM usuarios WHERE id = ?", (int(user_id),))
            user = cursor.fetchone()
            
            if not user:
                conn.close()
                return jsonify({'error': 'Usuario no encontrado'}), 404
            
            rol = user['rol']
            
            # Admin tiene todos los permisos
            if rol == 'admin':
                conn.close()
                return f(*args, **kwargs)
            
            # Verificar permiso específico
            cursor.execute("""
                SELECT COUNT(*) as tiene_permiso
                FROM rol_permisos rp
                JOIN permisos p ON rp.permiso_id = p.id
                WHERE rp.rol = ? AND p.modulo = ? AND p.accion = ?
            """, (rol, modulo, accion))
            
            result = cursor.fetchone()
            conn.close()
            
            if result['tiene_permiso'] == 0:
                return jsonify({'error': 'No tienes permisos para esta acción'}), 403
            
            return f(*args, **kwargs)
        return wrapper
    return decorator
