"""Servicio simple de notificaciones."""

import sqlite3
import os
from datetime import datetime


def get_db():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_path = os.path.join(base_dir, 'database', 'gestion_compras.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def crear_notificacion(usuario_id, tipo, titulo, mensaje):
    """Crear una notificación para un usuario."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje)
        VALUES (?, ?, ?, ?)
    """, (usuario_id, tipo, titulo, mensaje))
    notif_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return notif_id


def obtener_notificaciones(usuario_id, solo_no_leidas=False):
    """Obtener notificaciones de un usuario."""
    conn = get_db()
    cursor = conn.cursor()
    
    query = "SELECT * FROM notificaciones WHERE usuario_id = ?"
    params = [usuario_id]
    
    if solo_no_leidas:
        query += " AND leida = 0"
    
    query += " ORDER BY fecha_creacion DESC LIMIT 50"
    
    cursor.execute(query, params)
    notificaciones = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return notificaciones


def marcar_como_leida(notif_id):
    """Marcar notificación como leída."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE notificaciones SET leida = 1 WHERE id = ?", (notif_id,))
    conn.commit()
    conn.close()
