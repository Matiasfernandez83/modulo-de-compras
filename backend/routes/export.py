from flask import Blueprint, send_file, jsonify
from middleware.session_auth import login_required
from datetime import datetime
import os
from services.excel_exporter import (export_lista_precios_to_excel, export_competencia_to_excel, 
                                      export_orden_compra_to_excel, export_proveedores_to_excel,
                                      export_articulos_to_excel, export_usuarios_to_excel)

export_bp = Blueprint('export', __name__)

EXPORT_FOLDER = 'exports'

# Crear carpeta de exports si no existe
if not os.path.exists(EXPORT_FOLDER):
    os.makedirs(EXPORT_FOLDER)

@export_bp.route('/lista-precios/<int:lista_id>', methods=['GET'])
@login_required
def export_lista_precios(lista_id):
    """Exportar lista de precios a Excel"""
    try:
        filename = f'lista_precios_{lista_id}.xlsx'
        output_path = os.path.join(EXPORT_FOLDER, filename)
        export_lista_precios_to_excel(lista_id, output_path)
        return send_file(output_path, as_attachment=True, download_name=filename,
                        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': f'Error al exportar: {str(e)}'}), 500

@export_bp.route('/competencia/<int:competencia_id>', methods=['GET'])
@login_required
def export_competencia(competencia_id):
    """Exportar competencia a Excel"""
    try:
        filename = f'competencia_{competencia_id}.xlsx'
        output_path = os.path.join(EXPORT_FOLDER, filename)
        export_competencia_to_excel(competencia_id, output_path)
        return send_file(output_path, as_attachment=True, download_name=filename,
                        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': f'Error al exportar: {str(e)}'}), 500

@export_bp.route('/orden-compra/<int:orden_id>', methods=['GET'])
@login_required
def export_orden_compra(orden_id):
    """Exportar orden de compra a Excel"""
    try:
        filename = f'orden_compra_{orden_id}.xlsx'
        output_path = os.path.join(EXPORT_FOLDER, filename)
        export_orden_compra_to_excel(orden_id, output_path)
        return send_file(output_path, as_attachment=True, download_name=filename,
                        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': f'Error al exportar: {str(e)}'}), 500

@export_bp.route('/proveedores', methods=['GET'])
@login_required
def export_proveedores():
    """Exportar todos los proveedores a Excel"""
    try:
        filename = f'proveedores_{datetime.now().strftime("%Y%m%d")}.xlsx'
        output_path = os.path.join(EXPORT_FOLDER, filename)
        export_proveedores_to_excel(output_path)
        return send_file(output_path, as_attachment=True, download_name=filename,
                        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    except Exception as e:
        return jsonify({'error': f'Error al exportar: {str(e)}'}), 500

@export_bp.route('/articulos', methods=['GET'])
@login_required
def export_articulos():
    """Exportar todos los artículos a Excel"""
    try:
        filename = f'articulos_{datetime.now().strftime("%Y%m%d")}.xlsx'
        output_path = os.path.join(EXPORT_FOLDER, filename)
        export_articulos_to_excel(output_path)
        return send_file(output_path, as_attachment=True, download_name=filename,
                        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    except Exception as e:
        return jsonify({'error': f'Error al exportar: {str(e)}'}), 500

@export_bp.route('/usuarios', methods=['GET'])
@login_required
def export_usuarios():
    """Exportar todos los usuarios a Excel"""
    try:
        filename = f'usuarios_{datetime.now().strftime("%Y%m%d")}.xlsx'
        output_path = os.path.join(EXPORT_FOLDER, filename)
        export_usuarios_to_excel(output_path)
        return send_file(output_path, as_attachment=True, download_name=filename,
                        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    except Exception as e:
        return jsonify({'error': f'Error al exportar: {str(e)}'}), 500
