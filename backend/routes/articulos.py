from flask import Blueprint, request, jsonify
from middleware.session_auth import login_required, get_current_user_id, require_permission
import sqlite3
from routes.audit import registrar_auditoria

articulos_bp = Blueprint('articulos', __name__)

import os

def get_db():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_path = os.path.join(base_dir, 'database', 'gestion_compras.db')
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

@articulos_bp.route('', methods=['GET'])
@login_required
def get_articulos():
    """Obtener todos los artículos"""
    conn = get_db()
    cursor = conn.cursor()
    
    categoria_id = request.args.get('categoria_id')
    activo = request.args.get('activo', '1')
    
    if categoria_id:
        cursor.execute("""
            SELECT a.id, a.codigo_interno, a.nombre, a.descripcion, a.unidad_medida, a.activo,
                   c.nombre as categoria_nombre
            FROM articulos a
            LEFT JOIN categorias c ON a.categoria_id = c.id
            WHERE a.categoria_id = ? AND a.activo = ?
            ORDER BY a.nombre
        """, (categoria_id, activo))
    else:
        cursor.execute("""
            SELECT a.id, a.codigo_interno, a.nombre, a.descripcion, a.unidad_medida, a.activo,
                   c.nombre as categoria_nombre
            FROM articulos a
            LEFT JOIN categorias c ON a.categoria_id = c.id
            WHERE a.activo = ?
            ORDER BY a.nombre
        """, (activo,))
    
    articulos = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify(articulos), 200

@articulos_bp.route('/<int:id>', methods=['GET'])
@login_required
def get_articulo(id):
    """Obtener un artículo por ID"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT a.id, a.codigo_interno, a.nombre, a.descripcion, a.categoria_id, a.unidad_medida, a.activo,
               c.nombre as categoria_nombre
        FROM articulos a
        LEFT JOIN categorias c ON a.categoria_id = c.id
        WHERE a.id = ?
    """, (id,))
    
    articulo = cursor.fetchone()
    conn.close()
    
    if not articulo:
        return jsonify({'error': 'Artículo no encontrado'}), 404
    
    return jsonify(dict(articulo)), 200

@articulos_bp.route('', methods=['POST'])
@require_permission('articulos', 'crear')
def create_articulo():
    """Crear un nuevo artículo"""
    data = request.get_json()
    
    if not data.get('codigo_interno') or not data.get('nombre'):
        return jsonify({'error': 'Código interno y nombre son requeridos'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO articulos (codigo_interno, nombre, descripcion, categoria_id, unidad_medida)
            VALUES (?, ?, ?, ?, ?)
        """, (
            data.get('codigo_interno'),
            data.get('nombre'),
            data.get('descripcion'),
            data.get('categoria_id'),
            data.get('unidad_medida')
        ))
        
        articulo_id = cursor.lastrowid
        
        # Inicializar stock en 0
        cursor.execute("""
            INSERT INTO stock (articulo_id, cantidad) VALUES (?, 0)
        """, (articulo_id,))
        
        conn.commit()
        conn.close()
        
        # Registrar auditoría
        registrar_auditoria(
            usuario_id=get_current_user_id(),
            tabla='articulos',
            registro_id=articulo_id,
            accion='crear',
            datos_nuevos={
                'codigo_interno': data.get('codigo_interno'),
                'nombre': data.get('nombre')
            }
        )
        
        return jsonify({'id': articulo_id, 'message': 'Artículo creado exitosamente'}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'El código interno ya existe'}), 400

@articulos_bp.route('/<int:id>', methods=['PUT'])
@require_permission('articulos', 'editar')
def update_articulo(id):
    """Actualizar un artículo"""
    data = request.get_json()
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Obtener datos anteriores
    cursor.execute("SELECT codigo_interno, nombre FROM articulos WHERE id = ?", (id,))
    row = cursor.fetchone()
    datos_anteriores = dict(row) if row else {}
    
    cursor.execute("""
        UPDATE articulos
        SET codigo_interno = ?, nombre = ?, descripcion = ?, categoria_id = ?, unidad_medida = ?
        WHERE id = ?
    """, (
        data.get('codigo_interno'),
        data.get('nombre'),
        data.get('descripcion'),
        data.get('categoria_id'),
        data.get('unidad_medida'),
        id
    ))
    
    conn.commit()
    conn.close()
    
    # Registrar auditoría
    registrar_auditoria(
        usuario_id=get_current_user_id(),
        tabla='articulos',
        registro_id=id,
        accion='editar',
        datos_anteriores=datos_anteriores,
        datos_nuevos={
            'codigo_interno': data.get('codigo_interno'),
            'nombre': data.get('nombre')
        }
    )
    
    return jsonify({'message': 'Artículo actualizado exitosamente'}), 200

# Rutas de Categorías
@articulos_bp.route('/categorias', methods=['GET'])
@login_required
def get_categorias():
    """Obtener todas las categorías"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, nombre, descripcion, activo FROM categorias WHERE activo = 1 ORDER BY nombre")
    categorias = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify(categorias), 200

@articulos_bp.route('/categorias', methods=['POST'])
@login_required
def create_categoria():
    """Crear una nueva categoría"""
    data = request.get_json()
    
    if not data.get('nombre'):
        return jsonify({'error': 'El nombre es requerido'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)
    """, (data.get('nombre'), data.get('descripcion')))
    
    categoria_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({'id': categoria_id, 'message': 'Categoría creada exitosamente'}), 201

@articulos_bp.route('/<int:id>/historial-compras', methods=['GET'])
@login_required
def get_historial_compras_articulo(id):
    """Historial de OC donde aparece este artículo"""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT c.numero, c.fecha_emision, c.estado,
               p.nombre as proveedor,
               ci.cantidad, ci.precio_unitario, ci.subtotal,
               c.id as comprobante_id
        FROM comprobante_items ci
        JOIN comprobantes c ON ci.comprobante_id = c.id
        JOIN proveedores p ON c.proveedor_id = p.id
        WHERE ci.articulo_id = ? AND c.tipo = 'orden_compra'
        ORDER BY c.fecha_emision DESC
        LIMIT 50
    """, (id,))
    compras = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(compras), 200

@articulos_bp.route('/<int:id>/historial-precios', methods=['GET'])
@login_required
def get_historial_precios_articulo(id):
    """Historial de listas de precios que incluyen este artículo"""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT lp.nombre as lista, lp.fecha_vigencia, lp.moneda,
               p.nombre as proveedor,
               lpi.precio_bruto, lpi.descuento_porcentaje, lpi.iva_porcentaje, lpi.precio_neto,
               lp.id as lista_id
        FROM lista_precios_items lpi
        JOIN listas_precios lp ON lpi.lista_precio_id = lp.id
        JOIN proveedores p ON lp.proveedor_id = p.id
        WHERE lpi.articulo_id = ?
        ORDER BY lp.fecha_vigencia DESC
        LIMIT 50
    """, (id,))
    precios = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(precios), 200

@articulos_bp.route('/template', methods=['GET'])
@login_required
def download_template_articulos():
    """Descargar template Excel para carga masiva de artículos"""
    from flask import send_file
    import io
    try:
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment
    except ImportError:
        return jsonify({'error': 'openpyxl no instalado'}), 500

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Artículos"

    header_fill = PatternFill("solid", fgColor="1F4E79")
    header_font = Font(bold=True, color="FFFFFF", size=11)
    center = Alignment(horizontal="center")

    headers = ["Código Interno *", "Nombre *", "Descripción", "Categoría", "Unidad de Medida"]
    col_widths = [20, 35, 40, 20, 20]

    for i, (h, w) in enumerate(zip(headers, col_widths), 1):
        cell = ws.cell(row=1, column=i, value=h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center
        ws.column_dimensions[cell.column_letter].width = w

    ejemplos = [
        ["ART001", "Harina 000", "Harina de trigo tipo 000", "SECOS", "KG"],
        ["ART002", "Azúcar", "Azúcar blanca refinada", "SECOS", "KG"],
        ["ART014", "Aceite Girasol", "Aceite de girasol 1L", "SECOS", "LT"],
    ]
    for row_data in ejemplos:
        ws.append(row_data)

    ws.freeze_panes = "A2"

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    return send_file(
        buf, as_attachment=True,
        download_name="template_articulos.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
