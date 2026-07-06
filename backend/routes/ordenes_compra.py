from flask import Blueprint, request, jsonify
from middleware.session_auth import login_required, get_current_user_id, require_permission
import sqlite3
from routes.audit import registrar_auditoria
from services.notification_service import crear_notificacion

ordenes_compra_bp = Blueprint('ordenes_compra', __name__)

import os

from database.connection import get_db

@ordenes_compra_bp.route('', methods=['GET'])
@login_required
def get_ordenes_compra():
    """Obtener todas las órdenes de compra"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT c.id, c.numero, c.fecha_emision, c.fecha_entrega_estimada,
               c.estado, c.total, p.nombre as proveedor_nombre,
               d.nombre as deposito_nombre
        FROM comprobantes c
        JOIN proveedores p ON c.proveedor_id = p.id
        LEFT JOIN depositos d ON c.deposito_id = d.id
        WHERE c.tipo = 'orden_compra'
        ORDER BY c.fecha_emision DESC
    """)
    
    ordenes = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify(ordenes), 200

@ordenes_compra_bp.route('/<int:id>', methods=['GET'])
@login_required
def get_orden_compra(id):
    """Obtener una orden de compra completa"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT c.*, p.nombre as proveedor_nombre, p.forma_pago, p.plazo_pago, p.tiempo_entrega,
               d.nombre as deposito_nombre
        FROM comprobantes c
        JOIN proveedores p ON c.proveedor_id = p.id
        LEFT JOIN depositos d ON c.deposito_id = d.id
        WHERE c.id = ? AND c.tipo = 'orden_compra'
    """, (id,))
    
    orden = cursor.fetchone()
    
    if not orden:
        conn.close()
        return jsonify({'error': 'Orden de compra no encontrada'}), 404
    
    orden_dict = dict(orden)
    
    # Obtener items
    cursor.execute("""
        SELECT ci.*, a.codigo_interno, a.nombre as articulo_nombre
        FROM comprobante_items ci
        JOIN articulos a ON ci.articulo_id = a.id
        WHERE ci.comprobante_id = ?
    """, (id,))
    
    orden_dict['items'] = [dict(row) for row in cursor.fetchall()]
    
    # Obtener comprobantes relacionados
    cursor.execute("""
        SELECT cr.tipo_relacion, c2.id, c2.tipo, c2.numero, c2.fecha_emision
        FROM comprobantes_relaciones cr
        JOIN comprobantes c2 ON cr.comprobante_destino_id = c2.id
        WHERE cr.comprobante_origen_id = ?
    """, (id,))
    
    orden_dict['comprobantes_relacionados'] = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    
    return jsonify(orden_dict), 200

@ordenes_compra_bp.route('', methods=['POST'])
@require_permission('ordenes_compra', 'crear')
def create_orden_compra():
    """Crear una nueva orden de compra"""
    data = request.get_json()
    current_user_id = get_current_user_id()
    
    if not data.get('proveedor_id') or not data.get('items'):
        return jsonify({'error': 'Proveedor e items son requeridos'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Calcular totales
    subtotal = sum(item['precio_unitario'] * item['cantidad'] for item in data['items'])
    iva = subtotal * 0.21
    total = subtotal + iva
    
    # Generar número de OC provisional antes del insert
    cursor.execute("SELECT COUNT(*) as c FROM comprobantes WHERE tipo = 'orden_compra'")
    count = cursor.fetchone()['c'] + 1
    numero_oc = data.get('numero', f'OC-{count:04d}')
    
    # Crear orden de compra
    cursor.execute("""
        INSERT INTO comprobantes
        (tipo, numero, fecha_emision, proveedor_id, deposito_id, competencia_id,
         subtotal, iva, total, estado, usuario_creacion_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        'orden_compra',
        numero_oc,
        data.get('fecha_emision'),
        data.get('proveedor_id'),
        data.get('deposito_id'),
        data.get('competencia_id'),
        subtotal,
        iva,
        total,
        'abierta',
        current_user_id
    ))
    
    oc_id = cursor.lastrowid
    
    # Agregar items
    for item in data['items']:
        cursor.execute("""
            INSERT INTO comprobante_items
            (comprobante_id, articulo_id, cantidad, precio_unitario, subtotal)
            VALUES (?, ?, ?, ?, ?)
        """, (
            oc_id,
            item['articulo_id'],
            item['cantidad'],
            item['precio_unitario'],
            item['precio_unitario'] * item['cantidad']
        ))
    
    # Obtener nombre del proveedor para los mensajes
    cursor.execute("SELECT nombre FROM proveedores WHERE id = ?", (data.get('proveedor_id'),))
    prov_row = cursor.fetchone()
    proveedor_nombre = prov_row['nombre'] if prov_row else 'Desconocido'
    
    # Obtener todos los usuarios para notificar
    cursor.execute("SELECT id FROM usuarios WHERE activo = 1")
    todos_usuarios = [row['id'] for row in cursor.fetchall()]
    
    conn.commit()
    conn.close()
    
    # Registrar auditoría
    registrar_auditoria(
        usuario_id=current_user_id,
        tabla='comprobantes',
        registro_id=oc_id,
        accion='crear',
        datos_nuevos={
            'numero': numero_oc,
            'proveedor_id': data.get('proveedor_id'),
            'proveedor_nombre': proveedor_nombre,
            'total': total,
            'cantidad_items': len(data['items'])
        }
    )
    
    # Notificar a todos los usuarios
    for uid in todos_usuarios:
        crear_notificacion(
            usuario_id=uid,
            tipo='info',
            titulo=f'Nueva Orden de Compra: {numero_oc}',
            mensaje=f'Se creó la orden {numero_oc} para el proveedor {proveedor_nombre} por un total de ${total:,.2f}.'
        )
    
    return jsonify({'id': oc_id, 'message': 'Orden de compra creada exitosamente'}), 201
