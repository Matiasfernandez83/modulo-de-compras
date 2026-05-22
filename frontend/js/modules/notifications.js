// Sistema de notificaciones
import { API } from '../api.js';

let notificaciones = [];
let unreadCount = 0;
let notificationInterval = null;

export function initNotifications() {
    createNotificationUI();
    loadNotifications();
    startPolling();
}

function createNotificationUI() {
    const headerRight = document.querySelector('.header-right');
    
    // Crear botón de notificaciones
    const notifButton = document.createElement('div');
    notifButton.className = 'notification-button';
    notifButton.innerHTML = `
        <button id="notif-btn" class="btn btn-icon">
            🔔
            <span id="notif-badge" class="notification-badge" style="display: none;">0</span>
        </button>
    `;
    
    // Insertar antes del botón de logout
    const logoutBtn = document.getElementById('logout-btn');
    headerRight.insertBefore(notifButton, logoutBtn);
    
    // Crear panel de notificaciones
    const notifPanel = document.createElement('div');
    notifPanel.id = 'notification-panel';
    notifPanel.className = 'notification-panel';
    notifPanel.style.display = 'none';
    notifPanel.innerHTML = `
        <div class="notification-header">
            <h3>Notificaciones</h3>
            <button id="close-notif-panel" class="btn-close-panel">&times;</button>
        </div>
        <div id="notification-list" class="notification-list">
            <div class="flex-center" style="padding: 20px;">
                <div class="spinner"></div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notifPanel);
    
    // Event listeners
    document.getElementById('notif-btn').addEventListener('click', toggleNotificationPanel);
    document.getElementById('close-notif-panel').addEventListener('click', closeNotificationPanel);
}

async function loadNotifications() {
    try {
        notificaciones = await API.get('/notifications');
        unreadCount = notificaciones.filter(n => !n.leida).length;
        updateBadge();
        renderNotifications();
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

function updateBadge() {
    const badge = document.getElementById('notif-badge');
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

function renderNotifications() {
    const list = document.getElementById('notification-list');
    
    if (notificaciones.length === 0) {
        list.innerHTML = '<p class="text-center" style="padding: 20px;">No hay notificaciones</p>';
        return;
    }
    
    const html = notificaciones.map(n => `
        <div class="notification-item ${n.leida ? 'read' : 'unread'}" data-id="${n.id}">
            <div class="notification-icon ${n.tipo}">
                ${getNotificationIcon(n.tipo)}
            </div>
            <div class="notification-content">
                <h4>${n.titulo}</h4>
                <p>${n.mensaje}</p>
                <span class="notification-time">${formatTime(n.fecha_creacion)}</span>
            </div>
            ${!n.leida ? `<button class="btn-mark-read" onclick="window.notificationsModule.markAsRead(${n.id})">✓</button>` : ''}
        </div>
    `).join('');
    
    list.innerHTML = html;
}

function getNotificationIcon(tipo) {
    const icons = {
        'info': 'ℹ️',
        'success': '✅',
        'warning': '⚠️',
        'error': '❌'
    };
    return icons[tipo] || 'ℹ️';
}

function formatTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // segundos
    
    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    return date.toLocaleDateString('es-AR');
}

function toggleNotificationPanel() {
    const panel = document.getElementById('notification-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function closeNotificationPanel() {
    document.getElementById('notification-panel').style.display = 'none';
}

async function markAsRead(id) {
    try {
        await API.put(`/notifications/${id}/leer`, {});
        await loadNotifications();
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

function startPolling() {
    // Actualizar notificaciones cada 30 segundos
    notificationInterval = setInterval(loadNotifications, 30000);
}

export function stopPolling() {
    if (notificationInterval) {
        clearInterval(notificationInterval);
        notificationInterval = null;
    }
}

// Exportar funciones para uso global
window.notificationsModule = {
    markAsRead
};


