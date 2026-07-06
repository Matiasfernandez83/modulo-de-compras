"""Autenticación basada en sesiones de Flask (reemplaza JWT)."""

from functools import wraps
from flask import session, jsonify
import sqlite3
import os


from database.connection import get_db


def get_current_user_id():
    """Obtener el ID del usuario de la sesión actual."""
    return session.get('user_id')


def login_required(f):
    """Decorador que reemplaza @jwt_required(). Verifica que haya sesión activa."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Sesión no iniciada. Por favor iniciá sesión.'}), 401
        return f(*args, **kwargs)
    return wrapper


def require_permission(modulo, accion):
    """Decorador para verificar permisos (usa sesión en lugar de JWT)."""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if 'user_id' not in session:
                return jsonify({'error': 'Sesión no iniciada'}), 401

            user_id = session['user_id']
            rol = session.get('rol', '')

            # Admin tiene todos los permisos
            if rol == 'admin':
                return f(*args, **kwargs)

            # Verificar permiso específico en la base de datos
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT COUNT(*) as tiene_permiso
                FROM rol_permisos rp
                JOIN permisos p ON rp.permiso_id = p.id
                WHERE rp.rol = ? AND p.modulo = ? AND p.accion = ?
            """, (rol, modulo, accion))
            result = cursor.fetchone()
            conn.close()

            if result['tiene_permiso'] == 0:
                return jsonify({'error': 'No tenés permisos para esta acción'}), 403

            return f(*args, **kwargs)
        return wrapper
    return decorator
