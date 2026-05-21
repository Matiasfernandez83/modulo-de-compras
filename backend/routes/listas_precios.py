from flask import Blueprint, request, jsonify
from middleware.session_auth import login_required, get_current_user_id, require_permission
import sqlite3
from routes.audit import registrar_auditoria

listas_precios_bp = Blueprint('listas_precios', __name__)

import os

def get_db():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_path = os.path.join(base_dir, 'database', 'gestion_compras.db')
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

@listas_precios_bp.route('', methods=['GET'])
@login_required
def get_listas_precios():
    """Obtener todas las listas de precios"""
    conn = get_db()
    cursor = conn.cursor()
    
    proveedor_id = request.args.get('proveedor_id')
    
    if proveedor_id:
        cursor.execute("""
            SELECT lp.id, lp.nombre, lp.moneda, lp.fecha_vigencia, lp.fecha_vencimiento,
                   lp.fecha_ingreso, lp.activo, p.nombre as proveedor_nombre,
                   (SELECT COUNT(*) FROM lista_precios_items WHERE lista_precio_id = lp.id) as cantidad_articulos
            FROM listas_precios lp
            JOIN proveedores p ON lp.proveedor_id = p.id
            WHERE lp.proveedor_id = ?
            ORDER BY lp.fecha_vigencia DESC
        """, (proveedor_id,))
    else:
        cursor.execute("""
            SELECT lp.id, lp.nombre, lp.moneda, lp.fecha_vigencia, lp.fecha_vencimiento,
                   lp.fecha_ingreso, lp.activo, p.nombre as proveedor_nombre,
                   (SELECT COUNT(*) FROM lista_precios_items WHERE lista_precio_id = lp.id) as cantidad_articulos
            FROM listas_precios lp
            JOIN proveedores p ON lp.proveedor_id = p.id
            WHERE lp.activo = 1
            ORDER BY lp.fecha_vigencia DESC
        """)
    
    listas = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify(listas), 200

@listas_precios_bp.route('/<int:id>', methods=['GET'])
@login_required
def get_lista_precio(id):
    """Obtener una lista de precios con todos sus items"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Obtener encabezado de la lista
    cursor.execute("""
        SELECT lp.id, lp.nombre, lp.moneda, lp.fecha_vigencia, lp.fecha_vencimiento,
               lp.fecha_ingreso, lp.proveedor_id, p.nombre as proveedor_nombre
        FROM listas_precios lp
        JOIN proveedores p ON lp.proveedor_id = p.id
        WHERE lp.id = ?
    """, (id,))
    
    lista = cursor.fetchone()
    
    if not lista:
        conn.close()
        return jsonify({'error': 'Lista de precios no encontrada'}), 404
    
    lista_dict = dict(lista)
    
    # Obtener items agrupados por categoría
    cursor.execute("""
        SELECT 
            lpi.id, lpi.codigo_proveedor, lpi.codigo_externo, lpi.ingrediente,
            lpi.iva_porcentaje, lpi.precio_bruto, lpi.descuento_porcentaje,
            lpi.precio_neto, lpi.presentacion,
            a.id as articulo_id, a.codigo_interno, a.nombre as articulo_nombre,
            c.id as categoria_id, c.nombre as categoria_nombre
        FROM lista_precios_items lpi
        JOIN articulos a ON lpi.articulo_id = a.id
        LEFT JOIN categorias c ON a.categoria_id = c.id
        WHERE lpi.lista_precio_id = ?
        ORDER BY c.nombre, a.nombre
    """, (id,))
    
    items = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    # Agrupar por categoría
    categorias = {}
    for item in items:
        cat_nombre = item['categoria_nombre'] or 'Sin Categoría'
        if cat_nombre not in categorias:
            categorias[cat_nombre] = []
        categorias[cat_nombre].append(item)
    
    lista_dict['items_por_categoria'] = categorias
    lista_dict['total_items'] = len(items)
    
    return jsonify(lista_dict), 200

@listas_precios_bp.route('', methods=['POST'])
@require_permission('listas_precios', 'crear')
def create_lista_precio():
    """Crear una nueva lista de precios"""
    data = request.get_json()
    current_user_id = get_current_user_id()
    
    if not data.get('nombre') or not data.get('proveedor_id'):
        return jsonify({'error': 'Nombre y proveedor son requeridos'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO listas_precios 
        (nombre, proveedor_id, tipo, moneda, fecha_vigencia, fecha_vencimiento, usuario_creacion_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get('nombre'),
        data.get('proveedor_id'),
        data.get('tipo', 'generales'),
        data.get('moneda', 'PESOS'),
        data.get('fecha_vigencia'),
        data.get('fecha_vencimiento'),
        current_user_id
    ))
    
    lista_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Registrar auditoría
    registrar_auditoria(
        usuario_id=current_user_id,
        tabla='listas_precios',
        registro_id=lista_id,
        accion='crear',
        datos_nuevos={
            'nombre': data.get('nombre'),
            'proveedor_id': data.get('proveedor_id'),
            'moneda': data.get('moneda', 'PESOS'),
            'fecha_vigencia': data.get('fecha_vigencia')
        }
    )
    
    return jsonify({'id': lista_id, 'message': 'Lista de precios creada exitosamente'}), 201

@listas_precios_bp.route('/<int:id>/items', methods=['POST'])
@require_permission('listas_precios', 'editar')
def add_items_to_lista(id):
    """Agregar items a una lista de precios"""
    data = request.get_json()
    items = data.get('items', [])
    current_user_id = get_current_user_id()
    
    if not items:
        return jsonify({'error': 'No se enviaron items'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    for item in items:
        # Calcular precio neto
        precio_bruto = item.get('precio_bruto', 0)
        descuento = item.get('descuento_porcentaje', 0)
        iva = item.get('iva_porcentaje', 21)
        
        precio_con_descuento = precio_bruto * (1 - descuento/100)
        precio_neto = precio_con_descuento * (1 + iva/100)
        
        cursor.execute("""
            INSERT INTO lista_precios_items
            (lista_precio_id, articulo_id, codigo_proveedor, codigo_externo, ingrediente,
             iva_porcentaje, precio_bruto, descuento_porcentaje, precio_neto, presentacion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            id,
            item.get('articulo_id'),
            item.get('codigo_proveedor'),
            item.get('codigo_externo'),
            item.get('ingrediente'),
            iva,
            precio_bruto,
            descuento,
            precio_neto,
            item.get('presentacion')
        ))
    
    conn.commit()
    conn.close()
    
    # Registrar auditoría
    registrar_auditoria(
        usuario_id=current_user_id,
        tabla='lista_precios_items',
        registro_id=id,
        accion='editar',
        datos_nuevos={'items_agregados': len(items), 'lista_precio_id': id}
    )
    
    return jsonify({'message': f'{len(items)} items agregados exitosamente'}), 201
