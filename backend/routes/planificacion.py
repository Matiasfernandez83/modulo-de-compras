from flask import Blueprint, request, jsonify, send_file
from middleware.session_auth import login_required, get_current_user_id
import sqlite3
import os
import io

try:
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    OPENPYXL_OK = True
except ImportError:
    OPENPYXL_OK = False

planificacion_bp = Blueprint('planificacion', __name__)

from database.connection import get_db

@planificacion_bp.route('', methods=['GET'])
@login_required
def get_planificaciones():
    """Obtener todas las planificaciones"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM planificaciones ORDER BY fecha_creacion DESC")
    planificaciones = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(planificaciones), 200

@planificacion_bp.route('/<int:plan_id>', methods=['GET'])
@login_required
def get_planificacion_detail(plan_id):
    """Obtener detalle de una planificación con sus ítems"""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM planificaciones WHERE id = ?", (plan_id,))
    plan = cursor.fetchone()
    if not plan:
        conn.close()
        return jsonify({'error': 'Planificación no encontrada'}), 404

    plan_dict = dict(plan)

    # Obtener ítems con info del artículo
    cursor.execute("""
        SELECT pi.id, pi.articulo_id, pi.cantidad_requerida, pi.fecha_necesidad,
               a.codigo_interno, a.nombre, a.unidad_medida,
               c.nombre as categoria
        FROM planificacion_items pi
        JOIN articulos a ON pi.articulo_id = a.id
        LEFT JOIN categorias c ON a.categoria_id = c.id
        WHERE pi.planificacion_id = ?
        ORDER BY c.nombre, a.nombre
    """, (plan_id,))
    items = [dict(row) for row in cursor.fetchall()]
    conn.close()

    plan_dict['items'] = items
    plan_dict['total_items'] = len(items)
    return jsonify(plan_dict), 200

@planificacion_bp.route('', methods=['POST'])
@login_required
def create_planificacion():
    """Crear nueva planificación"""
    data = request.get_json()
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO planificaciones (nombre, descripcion, fecha_inicio, fecha_fin, usuario_creacion_id)
        VALUES (?, ?, ?, ?, ?)
    """, (data['nombre'], data.get('descripcion'), data['fecha_inicio'],
          data['fecha_fin'], get_current_user_id()))

    plan_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({'id': plan_id, 'message': 'Planificación creada'}), 201

@planificacion_bp.route('/<int:plan_id>/items', methods=['POST'])
@login_required
def add_item_planificacion(plan_id):
    """Agregar item a planificación"""
    data = request.get_json()
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO planificacion_items (planificacion_id, articulo_id, cantidad_requerida)
        VALUES (?, ?, ?)
    """, (plan_id, data['articulo_id'], data.get('cantidad_estimada', data.get('cantidad_requerida', 0))))

    conn.commit()
    conn.close()
    return jsonify({'message': 'Item agregado'}), 201

@planificacion_bp.route('/<int:plan_id>/items/bulk', methods=['POST'])
@login_required
def bulk_import_items(plan_id):
    """Importar ítems de planificación desde Excel"""
    if 'file' not in request.files:
        return jsonify({'error': 'No se envió archivo'}), 400

    file = request.files['file']
    if not file.filename.endswith(('.xlsx', '.xls')):
        return jsonify({'error': 'Solo se aceptan archivos Excel (.xlsx, .xls)'}), 400

    if not OPENPYXL_OK:
        return jsonify({'error': 'openpyxl no instalado'}), 500

    try:
        wb = openpyxl.load_workbook(file)
        ws = wb.active

        conn = get_db()
        cursor = conn.cursor()

        insertados = 0
        errores = []

        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row[0]:  # saltar filas vacías
                continue

            codigo = str(row[0]).strip()
            cantidad = row[2] if len(row) > 2 and row[2] else 1

            # Buscar artículo por código
            cursor.execute("SELECT id, nombre FROM articulos WHERE codigo_interno = ? AND activo = 1", (codigo,))
            art = cursor.fetchone()
            if not art:
                errores.append(f"Código '{codigo}' no encontrado")
                continue

            cursor.execute("""
                INSERT INTO planificacion_items (planificacion_id, articulo_id, cantidad_requerida)
                VALUES (?, ?, ?)
            """, (plan_id, art['id'], cantidad))
            insertados += 1

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'insertados': insertados,
            'errores': errores
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@planificacion_bp.route('/template', methods=['GET'])
@login_required
def download_template():
    """Descargar template Excel para carga masiva de planificación"""
    if not OPENPYXL_OK:
        return jsonify({'error': 'openpyxl no instalado'}), 500

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Planificación"

    # Estilo encabezado
    header_fill = PatternFill("solid", fgColor="1F4E79")
    header_font = Font(bold=True, color="FFFFFF", size=11)
    center = Alignment(horizontal="center")

    headers = ["Código Artículo *", "Nombre Artículo (referencia)", "Cantidad Requerida *", "Fecha Necesidad (YYYY-MM-DD)"]
    col_widths = [22, 35, 22, 30]

    for i, (h, w) in enumerate(zip(headers, col_widths), 1):
        cell = ws.cell(row=1, column=i, value=h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center
        ws.column_dimensions[cell.column_letter].width = w

    # Filas de ejemplo
    ejemplos = [
        ["ART001", "Harina 000", 500, "2026-04-01"],
        ["ART002", "Azúcar", 200, "2026-04-01"],
        ["ART003", "Arroz", 300, "2026-04-15"],
    ]
    for row_data in ejemplos:
        ws.append(row_data)

    ws.freeze_panes = "A2"

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    return send_file(
        buf,
        as_attachment=True,
        download_name="template_planificacion.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
