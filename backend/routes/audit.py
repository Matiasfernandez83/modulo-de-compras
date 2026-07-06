from flask import Blueprint, jsonify, request
from middleware.session_auth import login_required
import sqlite3
import os
import json

audit_bp = Blueprint('audit', __name__)

from database.connection import get_db

@audit_bp.route('', methods=['GET'])
@login_required
def get_audit_log():
    """Obtener historial de auditoría"""
    tabla = request.args.get('tabla')
    usuario_id = request.args.get('usuario_id')
    limit = int(request.args.get('limit', 100))
    
    conn = get_db()
    cursor = conn.cursor()
    
    query = """
        SELECT al.*, u.username
        FROM audit_log al
        JOIN usuarios u ON al.usuario_id = u.id
        WHERE 1=1
    """
    params = []
    
    if tabla:
        query += " AND al.tabla = ?"
        params.append(tabla)
    
    if usuario_id:
        query += " AND al.usuario_id = ?"
        params.append(int(usuario_id))
    
    query += " ORDER BY al.fecha_hora DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, params)
    logs = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify(logs), 200

def registrar_auditoria(usuario_id, tabla, registro_id, accion, datos_anteriores=None, datos_nuevos=None):
    """Función helper para registrar en auditoría"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO audit_log (usuario_id, tabla, registro_id, accion, datos_anteriores, datos_nuevos)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (usuario_id, tabla, registro_id, accion, 
          json.dumps(datos_anteriores) if datos_anteriores else None,
          json.dumps(datos_nuevos) if datos_nuevos else None))
    conn.commit()
    conn.close()
