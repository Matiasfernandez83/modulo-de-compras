from flask import Blueprint, jsonify
from middleware.session_auth import login_required
from services.matching_service import find_matches_by_code, get_articulos_sin_match

matching_bp = Blueprint('matching', __name__)

@matching_bp.route('/by-code/<codigo>', methods=['GET'])
@login_required
def match_by_code(codigo):
    """Buscar matches por código interno"""
    matches = find_matches_by_code(codigo)
    return jsonify({'codigo': codigo, 'matches': matches, 'total': len(matches)}), 200

@matching_bp.route('/sin-match', methods=['GET'])
@login_required
def articulos_sin_match():
    """Artículos sin códigos de proveedor"""
    articulos = get_articulos_sin_match()
    return jsonify({'articulos': articulos, 'total': len(articulos)}), 200
