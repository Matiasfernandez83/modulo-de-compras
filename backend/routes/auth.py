from flask import Blueprint, request, jsonify, session
from werkzeug.security import check_password_hash
import sqlite3
import time
from collections import defaultdict, deque
from datetime import datetime
import os

auth_bp = Blueprint('auth', __name__)


from database.connection import get_db

# Límite de intentos de login por IP (protección contra fuerza bruta).
# En memoria: con varios workers el límite es por worker, suficiente como freno.
LOGIN_MAX_ATTEMPTS = 10
LOGIN_WINDOW_SECONDS = 300
_login_attempts = defaultdict(deque)


def _too_many_attempts(key):
    now = time.time()
    attempts = _login_attempts[key]
    while attempts and now - attempts[0] > LOGIN_WINDOW_SECONDS:
        attempts.popleft()
    return len(attempts) >= LOGIN_MAX_ATTEMPTS


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login de usuario - inicia sesión de Flask"""
    data = request.get_json()

    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Usuario y contraseña requeridos'}), 400

    client_key = request.remote_addr or 'unknown'
    if _too_many_attempts(client_key):
        return jsonify({'error': 'Demasiados intentos de login. Probá de nuevo en unos minutos.'}), 429

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, username, email, password_hash, nombre_completo, rol, activo
        FROM usuarios WHERE username = ? AND activo = 1
    """, (data['username'],))

    user = cursor.fetchone()

    if not user or not check_password_hash(user['password_hash'], data['password']):
        conn.close()
        _login_attempts[client_key].append(time.time())
        return jsonify({'error': 'Credenciales inválidas'}), 401

    _login_attempts.pop(client_key, None)

    # Guardar sesión en el servidor (cookie automática)
    session.permanent = True
    session['user_id'] = user['id']
    session['username'] = user['username']
    session['rol'] = user['rol']

    # Registrar inicio de sesión
    cursor.execute("""
        INSERT INTO sesiones_usuario (usuario_id, ip_address)
        VALUES (?, ?)
    """, (user['id'], request.remote_addr))
    sesion_id = cursor.lastrowid

    # Actualizar último acceso
    cursor.execute("""
        UPDATE usuarios SET ultimo_acceso = ? WHERE id = ?
    """, (datetime.now(), user['id']))

    conn.commit()
    conn.close()

    return jsonify({
        'sesion_id': sesion_id,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'nombre_completo': user['nombre_completo'],
            'rol': user['rol']
        }
    }), 200


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Logout de usuario - destruye la sesión"""
    data = request.get_json(silent=True) or {}
    sesion_id = data.get('sesion_id')
    user_id = session.get('user_id')

    # Solo cerrar registros de sesión que pertenezcan al usuario logueado
    if sesion_id and user_id:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE sesiones_usuario
            SET fecha_fin = ?,
                duracion_minutos = CAST((julianday(?) - julianday(fecha_inicio)) * 24 * 60 AS INTEGER)
            WHERE id = ? AND usuario_id = ?
        """, (datetime.now(), datetime.now(), sesion_id, user_id))
        conn.commit()
        conn.close()

    session.clear()
    return jsonify({'message': 'Sesión cerrada correctamente'}), 200


@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    """Obtener usuario de la sesión actual"""
    if 'user_id' not in session:
        return jsonify({'error': 'No hay sesión activa'}), 401

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, username, email, nombre_completo, rol, ultimo_acceso
        FROM usuarios WHERE id = ?
    """, (session['user_id'],))

    user = cursor.fetchone()
    conn.close()

    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404

    return jsonify({
        'id': user['id'],
        'username': user['username'],
        'email': user['email'],
        'nombre_completo': user['nombre_completo'],
        'rol': user['rol'],
        'ultimo_acceso': user['ultimo_acceso']
    }), 200
