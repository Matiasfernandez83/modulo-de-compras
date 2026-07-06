from flask import Blueprint, request, jsonify
from middleware.session_auth import login_required
from werkzeug.utils import secure_filename
import os
from services.excel_parser import parse_articulos_excel, parse_proveedores_excel, parse_lista_precios_excel
from services.pdf_parser import parse_pdf_lista_precios
import sqlite3

upload_bp = Blueprint('upload', __name__)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'pdf'}  # Excel y PDF

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

from database.connection import get_db

@upload_bp.route('/articulos', methods=['POST'])
@login_required
def upload_articulos():
    """Subir archivo Excel con artículos"""
    
    if 'file' not in request.files:
        return jsonify({'error': 'No se envió ningún archivo'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'Nombre de archivo vacío'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Solo se permiten archivos Excel (.xlsx, .xls) o PDF'}), 400
    
    # Guardar archivo temporalmente
    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    file.save(filepath)
    
    try:
        # Parsear Excel
        result = parse_articulos_excel(filepath)
        
        if not result['success']:
            return jsonify({'error': result['error']}), 400
        
        # Insertar en base de datos
        conn = get_db()
        cursor = conn.cursor()
        
        insertados = 0
        errores = []
        
        for articulo in result['articulos']:
            try:
                # Buscar o crear categoría
                categoria_id = None
                if articulo['categoria']:
                    cursor.execute("SELECT id FROM categorias WHERE nombre = ?", (articulo['categoria'],))
                    cat = cursor.fetchone()
                    if cat:
                        categoria_id = cat['id']
                    else:
                        cursor.execute("INSERT INTO categorias (nombre) VALUES (?)", (articulo['categoria'],))
                        categoria_id = cursor.lastrowid
                
                # Insertar artículo
                cursor.execute("""
                    INSERT INTO articulos (codigo_interno, nombre, descripcion, categoria_id, unidad_medida)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    articulo['codigo_interno'],
                    articulo['nombre'],
                    articulo['descripcion'],
                    categoria_id,
                    articulo['unidad_medida']
                ))
                
                # Inicializar stock
                articulo_id = cursor.lastrowid
                cursor.execute("INSERT INTO stock (articulo_id, cantidad) VALUES (?, 0)", (articulo_id,))
                
                insertados += 1
                
            except sqlite3.IntegrityError as e:
                errores.append(f"Código {articulo['codigo_interno']}: Ya existe")
            except Exception as e:
                errores.append(f"Código {articulo['codigo_interno']}: {str(e)}")
        
        conn.commit()
        conn.close()
        
        # Eliminar archivo temporal
        os.remove(filepath)
        
        return jsonify({
            'success': True,
            'insertados': insertados,
            'total': result['total'],
            'errores': errores
        }), 200
        
    except Exception as e:
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({'error': str(e)}), 500

@upload_bp.route('/proveedores', methods=['POST'])
@login_required
def upload_proveedores():
    """Subir archivo Excel con proveedores"""
    
    if 'file' not in request.files:
        return jsonify({'error': 'No se envió ningún archivo'}), 400
    
    file = request.files['file']
    
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({'error': 'Archivo inválido'}), 400
    
    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    file.save(filepath)
    
    try:
        result = parse_proveedores_excel(filepath)
        
        if not result['success']:
            return jsonify({'error': result['error']}), 400
        
        conn = get_db()
        cursor = conn.cursor()
        
        insertados = 0
        errores = []
        
        for proveedor in result['proveedores']:
            try:
                cursor.execute("""
                    INSERT INTO proveedores (nombre, telefono, direccion, email, forma_pago, plazo_pago, tiempo_entrega)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    proveedor['nombre'],
                    proveedor['telefono'],
                    proveedor['direccion'],
                    proveedor['email'],
                    proveedor['forma_pago'],
                    proveedor['plazo_pago'],
                    proveedor['tiempo_entrega']
                ))
                insertados += 1
            except Exception as e:
                errores.append(f"{proveedor['nombre']}: {str(e)}")
        
        conn.commit()
        conn.close()
        os.remove(filepath)
        
        return jsonify({
            'success': True,
            'insertados': insertados,
            'total': result['total'],
            'errores': errores
        }), 200
        
    except Exception as e:
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({'error': str(e)}), 500

@upload_bp.route('/lista-precios/<int:lista_id>', methods=['POST'])
@login_required
def upload_lista_precios(lista_id):
    """Subir archivo Excel con items de lista de precios"""
    
    if 'file' not in request.files:
        return jsonify({'error': 'No se envió ningún archivo'}), 400
    
    file = request.files['file']
    
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({'error': 'Archivo inválido'}), 400
    
    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    file.save(filepath)
    
    try:
        # Obtener proveedor_id de la lista
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT proveedor_id FROM listas_precios WHERE id = ?", (lista_id,))
        lista = cursor.fetchone()
        
        if not lista:
            return jsonify({'error': 'Lista de precios no encontrada'}), 404
        
        proveedor_id = lista['proveedor_id']
        
        # Detectar tipo de archivo y usar parser correcto
        file_ext = filename.rsplit('.', 1)[1].lower()
        
        if file_ext == 'pdf':
            result = parse_pdf_lista_precios(filepath)
        else:  # xlsx o xls
            result = parse_lista_precios_excel(filepath, proveedor_id)
        
        if not result['success']:
            return jsonify({'error': result['error']}), 400
        
        insertados = 0
        errores = []
        
        for item in result['items']:
            try:
                # Buscar artículo por código
                articulo_id = None
                if item['codigo_interno']:
                    cursor.execute("SELECT id FROM articulos WHERE codigo_interno = ?", (item['codigo_interno'],))
                    art = cursor.fetchone()
                    if art:
                        articulo_id = art['id']
                
                if not articulo_id:
                    errores.append(f"Código {item['codigo_interno']}: Artículo no encontrado")
                    continue
                
                # Calcular precio neto
                precio_bruto = item['precio_bruto']
                descuento = item['descuento_porcentaje']
                iva = item['iva_porcentaje']
                
                precio_con_desc = precio_bruto * (1 - descuento/100)
                precio_neto = precio_con_desc * (1 + iva/100)
                
                cursor.execute("""
                    INSERT INTO lista_precios_items
                    (lista_precio_id, articulo_id, codigo_proveedor, ingrediente,
                     iva_porcentaje, precio_bruto, descuento_porcentaje, precio_neto)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    lista_id,
                    articulo_id,
                    item['codigo_proveedor'],
                    item['ingrediente'],
                    iva,
                    precio_bruto,
                    descuento,
                    precio_neto
                ))
                insertados += 1
                
            except Exception as e:
                errores.append(f"Item: {str(e)}")
        
        conn.commit()
        conn.close()
        os.remove(filepath)
        
        return jsonify({
            'success': True,
            'insertados': insertados,
            'total': result['total'],
            'errores': errores
        }), 200
        
    except Exception as e:
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({'error': str(e)}), 500
