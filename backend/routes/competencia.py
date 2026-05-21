from flask import Blueprint, request, jsonify
from middleware.session_auth import login_required, get_current_user_id, require_permission
import sqlite3
from routes.audit import registrar_auditoria

competencia_bp = Blueprint('competencia', __name__)

import os

def get_db():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_path = os.path.join(base_dir, 'database', 'gestion_compras.db')
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

@competencia_bp.route('', methods=['GET'])
@login_required
def get_competencias():
    """Obtener todas las competencias"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, nombre, origen, fecha_inicio_periodo, fecha_fin_periodo,
               estado, fecha_creacion
        FROM competencias
        ORDER BY fecha_creacion DESC
    """)
    
    competencias = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify(competencias), 200

@competencia_bp.route('/<int:id>', methods=['GET'])
@login_required
def get_competencia(id):
    """Obtener una competencia completa"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM competencias WHERE id = ?
    """, (id,))
    
    competencia = cursor.fetchone()
    
    if not competencia:
        conn.close()
        return jsonify({'error': 'Competencia no encontrada'}), 404
    
    competencia_dict = dict(competencia)
    
    # Obtener proveedores participantes
    cursor.execute("""
        SELECT cp.id, cp.proveedor_id, cp.seleccionado,
               p.nombre, p.forma_pago, p.plazo_pago, p.tiempo_entrega
        FROM competencia_proveedores cp
        JOIN proveedores p ON cp.proveedor_id = p.id
        WHERE cp.competencia_id = ?
    """, (id,))
    
    competencia_dict['proveedores'] = [dict(row) for row in cursor.fetchall()]
    
    # Obtener items
    cursor.execute("""
        SELECT ci.*, a.codigo_interno, a.nombre as articulo_nombre,
               c.nombre as categoria_nombre
        FROM competencia_items ci
        JOIN articulos a ON ci.articulo_id = a.id
        LEFT JOIN categorias c ON a.categoria_id = c.id
        WHERE ci.competencia_id = ?
        ORDER BY c.nombre, a.nombre
    """, (id,))
    
    items = [dict(row) for row in cursor.fetchall()]
    
    # Agrupar por categoría
    categorias = {}
    for item in items:
        cat_nombre = item['categoria_nombre'] or 'Sin Categoría'
        if cat_nombre not in categorias:
            categorias[cat_nombre] = []
        categorias[cat_nombre].append(item)
    
    competencia_dict['items_por_categoria'] = categorias
    
    conn.close()
    
    return jsonify(competencia_dict), 200

@competencia_bp.route('', methods=['POST'])
@require_permission('competencia', 'crear')
def create_competencia():
    """Crear una nueva competencia"""
    data = request.get_json()
    current_user_id = get_current_user_id()
    
    if not data.get('nombre'):
        return jsonify({'error': 'El nombre es requerido'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO competencias
        (nombre, planificacion_id, origen, fecha_inicio_periodo, fecha_fin_periodo,
         fecha_precios_desde, deposito_entrega_id, tipo_entrega, usuario_creacion_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get('nombre'),
        data.get('planificacion_id'),
        data.get('origen'),
        data.get('fecha_inicio_periodo'),
        data.get('fecha_fin_periodo'),
        data.get('fecha_precios_desde'),
        data.get('deposito_entrega_id'),
        data.get('tipo_entrega'),
        current_user_id
    ))
    
    competencia_id = cursor.lastrowid
    
    # Agregar proveedores
    if 'proveedores' in data:
        for prov_id in data['proveedores']:
            cursor.execute("""
                INSERT INTO competencia_proveedores (competencia_id, proveedor_id)
                VALUES (?, ?)
            """, (competencia_id, prov_id))
    
    conn.commit()
    conn.close()
    
    # Registrar auditoría
    registrar_auditoria(
        usuario_id=current_user_id,
        tabla='competencias',
        registro_id=competencia_id,
        accion='crear',
        datos_nuevos={
            'nombre': data.get('nombre'),
            'origen': data.get('origen'),
            'fecha_inicio_periodo': data.get('fecha_inicio_periodo'),
            'fecha_fin_periodo': data.get('fecha_fin_periodo')
        }
    )
    
    return jsonify({'id': competencia_id, 'message': 'Competencia creada exitosamente'}), 201

@competencia_bp.route('/<int:id>/confirmar', methods=['PUT'])
@require_permission('competencia', 'editar')
def confirmar_competencia(id):
    """Confirmar una competencia"""
    current_user_id = get_current_user_id()
    conn = get_db()
    cursor = conn.cursor()
    
    # Obtener datos anteriores
    cursor.execute("SELECT nombre, estado FROM competencias WHERE id = ?", (id,))
    row = cursor.fetchone()
    datos_anteriores = dict(row) if row else {}
    
    cursor.execute("""
        UPDATE competencias SET estado = 'confirmada' WHERE id = ?
    """, (id,))
    
    conn.commit()
    conn.close()
    
    # Registrar auditoría
    registrar_auditoria(
        usuario_id=current_user_id,
        tabla='competencias',
        registro_id=id,
        accion='editar',
        datos_anteriores=datos_anteriores,
        datos_nuevos={'estado': 'confirmada'}
    )
    
    return jsonify({'message': 'Competencia confirmada exitosamente'}), 200
