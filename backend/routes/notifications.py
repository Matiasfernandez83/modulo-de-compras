from flask import Blueprint, jsonify
from middleware.session_auth import login_required, get_current_user_id
from services.notification_service import obtener_notificaciones, marcar_como_leida

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('', methods=['GET'])
@login_required
def get_notifications():
    """Obtener notificaciones del usuario actual"""
    user_id = get_current_user_id()
    notificaciones = obtener_notificaciones(user_id)
    return jsonify(notificaciones), 200

@notifications_bp.route('/no-leidas', methods=['GET'])
@login_required
def get_unread_notifications():
    """Obtener solo notificaciones no leídas"""
    user_id = get_current_user_id()
    notificaciones = obtener_notificaciones(user_id, solo_no_leidas=True)
    return jsonify(notificaciones), 200

@notifications_bp.route('/<int:notif_id>/leer', methods=['PUT'])
@login_required
def mark_as_read(notif_id):
    """Marcar notificación como leída"""
    marcar_como_leida(notif_id)
    return jsonify({'message': 'Notificación marcada como leída'}), 200
