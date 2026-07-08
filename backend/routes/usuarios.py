from flask import Blueprint, request, jsonify
from middleware.session_auth import login_required
from werkzeug.security import generate_password_hash
import sqlite3

usuarios_bp = Blueprint('usuarios', __name__)

import os

from database.connection import get_db, IntegrityError

@usuarios_bp.route('', methods=['GET'])
@login_required
def get_usuarios():
    """Obtener todos los usuarios"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, username, email, nombre_completo, rol, activo, fecha_creacion, ultimo_acceso
        FROM usuarios
        ORDER BY nombre_completo
    """)
    
    usuarios = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify(usuarios), 200

@usuarios_bp.route('', methods=['POST'])
@login_required
def create_usuario():
    """Crear un nuevo usuario"""
    data = request.get_json()
    
    if not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Usuario, email y contraseña son requeridos'}), 400
    
    password_hash = generate_password_hash(data['password'])
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO usuarios (username, email, password_hash, nombre_completo, rol)
            VALUES (?, ?, ?, ?, ?)
        """, (
            data.get('username'),
            data.get('email'),
            password_hash,
            data.get('nombre_completo'),
            data.get('rol', 'comprador')
        ))
        
        usuario_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({'id': usuario_id, 'message': 'Usuario creado exitosamente'}), 201
    except IntegrityError:
        conn.close()
        return jsonify({'error': 'El usuario o email ya existe'}), 400

@usuarios_bp.route('/<int:id>/sesiones', methods=['GET'])
@login_required
def get_sesiones_usuario(id):
    """Obtener historial de sesiones de un usuario"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, fecha_inicio, fecha_fin, duracion_minutos, ip_address
        FROM sesiones_usuario
        WHERE usuario_id = ?
        ORDER BY fecha_inicio DESC
        LIMIT 50
    """, (id,))
    
    sesiones = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify(sesiones), 200

@usuarios_bp.route('/<int:id>/tiempo-uso', methods=['GET'])
@login_required
def get_tiempo_uso(id):
    """Obtener estadísticas de tiempo de uso"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT 
            COUNT(*) as total_sesiones,
            SUM(duracion_minutos) as minutos_totales,
            AVG(duracion_minutos) as promedio_minutos,
            MAX(duracion_minutos) as max_minutos
        FROM sesiones_usuario
        WHERE usuario_id = ? AND duracion_minutos IS NOT NULL
    """, (id,))
    
    stats = dict(cursor.fetchone())
    conn.close()
    
    return jsonify(stats), 200
