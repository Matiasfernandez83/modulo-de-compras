from flask import Blueprint, request, jsonify, session
from werkzeug.security import check_password_hash
import sqlite3
from datetime import datetime
import os

auth_bp = Blueprint('auth', __name__)


def get_db():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_path = os.path.join(base_dir, 'database', 'gestion_compras.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login de usuario - inicia sesión de Flask"""
    data = request.get_json()

    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Usuario y contraseña requeridos'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, username, email, password_hash, nombre_completo, rol, activo
        FROM usuarios WHERE username = ? AND activo = 1
    """, (data['username'],))

    user = cursor.fetchone()

    if not user or not check_password_hash(user['password_hash'], data['password']):
        conn.close()
        return jsonify({'error': 'Credenciales inválidas'}), 401

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
    data = request.get_json() or {}
    sesion_id = data.get('sesion_id')

    if sesion_id:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE sesiones_usuario
            SET fecha_fin = ?,
                duracion_minutos = CAST((julianday(?) - julianday(fecha_inicio)) * 24 * 60 AS INTEGER)
            WHERE id = ?
        """, (datetime.now(), datetime.now(), sesion_id))
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
