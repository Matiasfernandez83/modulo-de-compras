from flask import Blueprint, request, jsonify
from middleware.session_auth import login_required, get_current_user_id, require_permission
import sqlite3
from routes.audit import registrar_auditoria

competencia_bp = Blueprint('competencia', __name__)

import os

from database.connection import get_db

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

@competencia_bp.route('/<int:id>/matriz', methods=['GET'])
@login_required
def get_matriz_comparacion(id):
    """Matriz de comparación: cada insumo × cada proveedor con su precio.

    Para cada ítem de la competencia busca el precio de cada proveedor
    participante (último precio vigente de sus listas) y marca el más barato.
    Es la vista de comparativa propiamente dicha.
    """
    conn = get_db()
    cursor = conn.cursor()

    comp = cursor.execute("SELECT id, nombre FROM competencias WHERE id = ?", (id,)).fetchone()
    if not comp:
        conn.close()
        return jsonify({'error': 'Competencia no encontrada'}), 404

    proveedores = [dict(row) for row in cursor.execute("""
        SELECT cp.proveedor_id, p.nombre, p.plazo_pago, p.tiempo_entrega
        FROM competencia_proveedores cp
        JOIN proveedores p ON cp.proveedor_id = p.id
        WHERE cp.competencia_id = ?
        ORDER BY p.nombre
    """, (id,)).fetchall()]

    items_raw = cursor.execute("""
        SELECT ci.articulo_id, ci.cantidad_necesaria, ci.compra_sugerida,
               a.codigo_interno, a.nombre, a.unidad_medida, s.nombre as categoria
        FROM competencia_items ci
        JOIN articulos a ON ci.articulo_id = a.id
        LEFT JOIN subcategorias s ON a.subcategoria_id = s.id
        WHERE ci.competencia_id = ?
        ORDER BY s.nombre, a.nombre
    """, (id,)).fetchall()

    # Precio de cada artículo por cada proveedor participante (último precio vigente)
    precios = {}  # (articulo_id, proveedor_id) -> precio_neto
    if proveedores and items_raw:
        art_ids = [it['articulo_id'] for it in items_raw]
        prov_ids = [p['proveedor_id'] for p in proveedores]
        art_ph = ','.join('?' * len(art_ids))
        prov_ph = ','.join('?' * len(prov_ids))
        for row in cursor.execute(f"""
            SELECT lpi.articulo_id, lp.proveedor_id,
                   lpi.precio_neto, lp.fecha_vigencia
            FROM lista_precios_items lpi
            JOIN listas_precios lp ON lpi.lista_precio_id = lp.id AND lp.activo = 1
            WHERE lpi.articulo_id IN ({art_ph}) AND lp.proveedor_id IN ({prov_ph})
              AND lpi.precio_neto IS NOT NULL
            ORDER BY lp.fecha_vigencia ASC
        """, (*art_ids, *prov_ids)).fetchall():
            # ASC + sobreescritura deja el precio de la lista más reciente
            precios[(row['articulo_id'], row['proveedor_id'])] = row['precio_neto']

    items = []
    for it in items_raw:
        fila = dict(it)
        fila_precios = {}
        validos = []
        for p in proveedores:
            precio = precios.get((it['articulo_id'], p['proveedor_id']))
            fila_precios[p['proveedor_id']] = precio
            if precio is not None:
                validos.append((p['proveedor_id'], precio))
        mejor = min(validos, key=lambda x: x[1])[0] if validos else None
        fila['precios'] = fila_precios
        fila['mejor_proveedor_id'] = mejor
        items.append(fila)

    conn.close()
    return jsonify({
        'competencia': dict(comp),
        'proveedores': proveedores,
        'items': items,
        'sin_precios': not any(any(v is not None for v in it['precios'].values()) for it in items)
    }), 200


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
