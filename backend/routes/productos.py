"""Productos y sus estructuras (BOM / lista de materiales).

Un producto es lo que la empresa fabrica (ej: una batea). Su estructura define
qué insumos y en qué cantidad lleva UNA unidad. La planificación usa esta
receta para calcular necesidades de compra (explosión de materiales, como el
MRP de SAP).
"""

from flask import Blueprint, request, jsonify
from middleware.session_auth import login_required, require_permission
import sqlite3

from database.connection import get_db

productos_bp = Blueprint('productos', __name__)


@productos_bp.route('', methods=['GET'])
@login_required
def get_productos():
    """Listar productos con el tamaño de su estructura"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT p.id, p.codigo, p.nombre, p.descripcion, p.activo, p.fecha_creacion,
               COUNT(pm.id) as total_materiales
        FROM productos p
        LEFT JOIN producto_materiales pm ON pm.producto_id = p.id
        WHERE p.activo = 1
        GROUP BY p.id
        ORDER BY p.nombre
    """)
    productos = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(productos), 200


@productos_bp.route('', methods=['POST'])
@login_required
def create_producto():
    """Crear un producto"""
    data = request.get_json() or {}
    if not data.get('codigo') or not data.get('nombre'):
        return jsonify({'error': 'Código y nombre son requeridos'}), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO productos (codigo, nombre, descripcion) VALUES (?, ?, ?)",
                       (data['codigo'].strip().upper(), data['nombre'], data.get('descripcion')))
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Ya existe un producto con ese código'}), 400
    producto_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({'id': producto_id, 'message': 'Producto creado exitosamente'}), 201


@productos_bp.route('/<int:id>', methods=['GET'])
@login_required
def get_producto(id):
    """Obtener un producto con su estructura completa (BOM)"""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM productos WHERE id = ?", (id,))
    producto = cursor.fetchone()
    if not producto:
        conn.close()
        return jsonify({'error': 'Producto no encontrado'}), 404

    cursor.execute("""
        SELECT pm.id, pm.articulo_id, pm.cantidad_por_unidad, pm.seccion,
               pm.observaciones, pm.plano,
               a.codigo_interno, a.codigo_softland, a.nombre as articulo_nombre,
               a.unidad_medida, s.nombre as categoria
        FROM producto_materiales pm
        JOIN articulos a ON pm.articulo_id = a.id
        LEFT JOIN subcategorias s ON a.subcategoria_id = s.id
        WHERE pm.producto_id = ?
        ORDER BY pm.seccion, a.nombre
    """, (id,))
    materiales = [dict(row) for row in cursor.fetchall()]
    conn.close()

    resultado = dict(producto)
    resultado['materiales'] = materiales
    resultado['total_materiales'] = len(materiales)
    return jsonify(resultado), 200


@productos_bp.route('/<int:id>/materiales', methods=['POST'])
@login_required
def add_material(id):
    """Agregar un insumo a la estructura del producto"""
    data = request.get_json() or {}
    if not data.get('articulo_id') or not data.get('cantidad_por_unidad'):
        return jsonify({'error': 'Artículo y cantidad por unidad son requeridos'}), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO producto_materiales (producto_id, articulo_id, cantidad_por_unidad, seccion, observaciones)
            VALUES (?, ?, ?, ?, ?)
        """, (id, data['articulo_id'], data['cantidad_por_unidad'],
              data.get('seccion'), data.get('observaciones')))
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Ese artículo ya está en la estructura (editalo en lugar de agregarlo), o el producto no existe'}), 400
    conn.commit()
    conn.close()
    return jsonify({'message': 'Insumo agregado a la estructura'}), 201


@productos_bp.route('/<int:id>/materiales/<int:material_id>', methods=['PUT'])
@login_required
def update_material(id, material_id):
    """Modificar la cantidad por unidad de un insumo de la estructura"""
    data = request.get_json() or {}
    if not data.get('cantidad_por_unidad'):
        return jsonify({'error': 'cantidad_por_unidad es requerida'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE producto_materiales SET cantidad_por_unidad = ?
        WHERE id = ? AND producto_id = ?
    """, (data['cantidad_por_unidad'], material_id, id))
    if cursor.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Insumo no encontrado en la estructura'}), 404
    conn.commit()
    conn.close()
    return jsonify({'message': 'Cantidad actualizada'}), 200


@productos_bp.route('/<int:id>/materiales/<int:material_id>', methods=['DELETE'])
@login_required
def delete_material(id, material_id):
    """Quitar un insumo de la estructura del producto"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM producto_materiales WHERE id = ? AND producto_id = ?",
                   (material_id, id))
    if cursor.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Insumo no encontrado en la estructura'}), 404
    conn.commit()
    conn.close()
    return jsonify({'message': 'Insumo quitado de la estructura'}), 200
