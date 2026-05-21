from flask import Blueprint, jsonify
from middleware.session_auth import login_required
import sqlite3
import os
from datetime import datetime, timedelta

dashboard_bp = Blueprint('dashboard', __name__)

def get_db():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_path = os.path.join(base_dir, 'database', 'gestion_compras.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

@dashboard_bp.route('/stats', methods=['GET'])
@login_required
def get_stats():
    """Obtener estadísticas generales del sistema"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Proveedores activos
    cursor.execute("SELECT COUNT(*) as total FROM proveedores WHERE activo = 1")
    proveedores = cursor.fetchone()['total']
    
    # Artículos en catálogo
    cursor.execute("SELECT COUNT(*) as total FROM articulos WHERE activo = 1")
    articulos = cursor.fetchone()['total']
    
    # Competencias activas
    cursor.execute("SELECT COUNT(*) as total FROM competencias WHERE estado = 'activa'")
    competencias_activas = cursor.fetchone()['total']
    
    # Órdenes de compra este mes
    primer_dia_mes = datetime.now().replace(day=1).strftime('%Y-%m-%d')
    cursor.execute("""
        SELECT COUNT(*) as total 
        FROM comprobantes 
        WHERE tipo = 'orden_compra' AND fecha_emision >= ?
    """, (primer_dia_mes,))
    ordenes_mes = cursor.fetchone()['total']
    
    # Listas de precios activas
    cursor.execute("SELECT COUNT(*) as total FROM listas_precios WHERE activo = 1")
    listas_activas = cursor.fetchone()['total']
    
    # Total de usuarios
    cursor.execute("SELECT COUNT(*) as total FROM usuarios WHERE activo = 1")
    usuarios = cursor.fetchone()['total']
    
    conn.close()
    
    return jsonify({
        'proveedores_activos': proveedores,
        'articulos_catalogo': articulos,
        'competencias_activas': competencias_activas,
        'ordenes_mes': ordenes_mes,
        'listas_activas': listas_activas,
        'usuarios_activos': usuarios
    }), 200

@dashboard_bp.route('/recent-activity', methods=['GET'])
@login_required
def get_recent_activity():
    """Obtener actividad reciente del sistema"""
    conn = get_db()
    cursor = conn.cursor()
    
    activities = []
    
    # Últimas órdenes de compra
    cursor.execute("""
        SELECT 'orden_compra' as tipo, c.numero as detalle, c.fecha_emision as fecha,
               p.nombre as relacionado
        FROM comprobantes c
        JOIN proveedores p ON c.proveedor_id = p.id
        WHERE c.tipo = 'orden_compra'
        ORDER BY c.fecha_emision DESC
        LIMIT 5
    """)
    activities.extend([dict(row) for row in cursor.fetchall()])
    
    # Últimas competencias
    cursor.execute("""
        SELECT 'competencia' as tipo, nombre as detalle, fecha_creacion as fecha,
               '' as relacionado
        FROM competencias
        ORDER BY fecha_creacion DESC
        LIMIT 5
    """)
    activities.extend([dict(row) for row in cursor.fetchall()])
    
    # Últimas listas de precios
    cursor.execute("""
        SELECT 'lista_precios' as tipo, lp.nombre as detalle, lp.fecha_ingreso as fecha,
               p.nombre as relacionado
        FROM listas_precios lp
        JOIN proveedores p ON lp.proveedor_id = p.id
        ORDER BY lp.fecha_ingreso DESC
        LIMIT 5
    """)
    activities.extend([dict(row) for row in cursor.fetchall()])
    
    conn.close()
    
    # Ordenar por fecha
    activities.sort(key=lambda x: x['fecha'], reverse=True)
    
    return jsonify(activities[:10]), 200

@dashboard_bp.route('/charts/monthly-orders', methods=['GET'])
@login_required
def get_monthly_orders():
    """Obtener órdenes de compra por mes (últimos 6 meses)"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Calcular últimos 6 meses
    meses = []
    for i in range(5, -1, -1):
        fecha = datetime.now() - timedelta(days=30*i)
        meses.append({
            'mes': fecha.strftime('%Y-%m'),
            'nombre': fecha.strftime('%B %Y')
        })
    
    data = []
    for mes_info in meses:
        cursor.execute("""
            SELECT COUNT(*) as total
            FROM comprobantes
            WHERE tipo = 'orden_compra' AND strftime('%Y-%m', fecha_emision) = ?
        """, (mes_info['mes'],))
        total = cursor.fetchone()['total']
        data.append({
            'mes': mes_info['nombre'],
            'total': total
        })
    
    conn.close()
    return jsonify(data), 200

@dashboard_bp.route('/charts/supplier-distribution', methods=['GET'])
@login_required
def get_supplier_distribution():
    """Obtener distribución de órdenes por proveedor"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT p.nombre, COUNT(c.id) as total
        FROM proveedores p
        LEFT JOIN comprobantes c ON p.id = c.proveedor_id AND c.tipo = 'orden_compra'
        WHERE p.activo = 1
        GROUP BY p.id, p.nombre
        ORDER BY total DESC
        LIMIT 10
    """)
    
    data = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify(data), 200

@dashboard_bp.route('/charts/category-distribution', methods=['GET'])
@login_required
def get_category_distribution():
    """Obtener distribución de artículos por categoría"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT c.nombre, COUNT(a.id) as total
        FROM categorias c
        LEFT JOIN articulos a ON c.id = a.categoria_id AND a.activo = 1
        GROUP BY c.id, c.nombre
        ORDER BY total DESC
    """)
    
    data = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify(data), 200

@dashboard_bp.route('/top-proveedores', methods=['GET'])
@login_required
def get_top_proveedores():
    """Top 5 proveedores con más órdenes"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT p.nombre, COUNT(c.id) as total_ordenes
        FROM proveedores p
        LEFT JOIN comprobantes c ON p.id = c.proveedor_id AND c.tipo = 'orden_compra'
        WHERE p.activo = 1
        GROUP BY p.id, p.nombre
        ORDER BY total_ordenes DESC
        LIMIT 5
    """)
    data = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(data), 200

@dashboard_bp.route('/precio-promedio-categoria', methods=['GET'])
@login_required
def get_precio_promedio_categoria():
    """Precio promedio por categoría"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.nombre as categoria, AVG(lpi.precio_neto) as precio_promedio
        FROM categorias c
        JOIN articulos a ON c.id = a.categoria_id
        JOIN lista_precios_items lpi ON a.id = lpi.articulo_id
        GROUP BY c.id, c.nombre
        ORDER BY precio_promedio DESC
    """)
    data = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(data), 200

