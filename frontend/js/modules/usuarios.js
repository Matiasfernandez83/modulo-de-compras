// Módulo de Usuarios
import { UsuariosAPI } from '../api.js';

let usuarios = [];
let currentUsuarioId = null;

export async function initUsuarios() {
    renderUsuariosView();
    await loadUsuarios();
}

function renderUsuariosView() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Gestión de Usuarios</h2>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-secondary" onclick="window.ExportAPI.usuarios()">
                        📊 Exportar Excel
                    </button>
                    <button class="btn btn-primary" onclick="window.usuariosModule.showCreateModal()">
                        + Nuevo Usuario
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div id="usuarios-table-container">
                    <div class="flex-center" style="padding: 40px;">
                        <div class="spinner"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal para crear usuario -->
        <div id="usuario-modal" class="modal-overlay" style="display: none;">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Nuevo Usuario</h3>
                    <button class="modal-close" onclick="window.usuariosModule.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="usuario-form">
                        <div class="form-group">
                            <label for="username">Usuario *</label>
                            <input type="text" id="username" name="username" required>
                        </div>
                        <div class="form-group">
                            <label for="email">Email *</label>
                            <input type="email" id="email" name="email" required>
                        </div>
                        <div class="form-group">
                            <label for="password">Contraseña *</label>
                            <input type="password" id="password" name="password" required minlength="6">
                            <small class="text-muted">Mínimo 6 caracteres</small>
                        </div>
                        <div class="form-group">
                            <label for="nombre_completo">Nombre Completo</label>
                            <input type="text" id="nombre_completo" name="nombre_completo">
                        </div>
                        <div class="form-group">
                            <label for="rol">Rol *</label>
                            <select id="rol" name="rol" required>
                                <option value="">Seleccione un rol...</option>
                                <option value="admin">Admin - Acceso completo</option>
                                <option value="comprador">Comprador - Gestión de compras</option>
                                <option value="visualizador">Visualizador - Solo lectura</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="window.usuariosModule.closeModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="window.usuariosModule.saveUsuario()">Crear Usuario</button>
                </div>
            </div>
        </div>

        <!-- Modal para vista detallada -->
        <div id="usuario-detail-modal" class="modal-overlay" style="display: none;">
            <div class="modal" style="max-width: 900px;">
                <div class="modal-header">
                    <h3 class="modal-title" id="detail-modal-title">Usuario</h3>
                    <button class="modal-close" onclick="window.usuariosModule.closeDetailModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <!-- Tabs de navegación -->
                    <div class="tabs-container">
                        <div class="tabs-nav" id="usuario-tabs">
                            <button class="tab-btn active" data-tab="info">Información</button>
                            <button class="tab-btn" data-tab="sesiones">Historial de Sesiones</button>
                            <button class="tab-btn" data-tab="estadisticas">Estadísticas de Uso</button>
                        </div>
                        <div class="tabs-content" id="usuario-tabs-content">
                            <!-- El contenido se cargará dinámicamente -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function loadUsuarios() {
    try {
        usuarios = await UsuariosAPI.getAll();
        renderUsuariosTable();
    } catch (error) {
        console.error('Error loading usuarios:', error);
        document.getElementById('usuarios-table-container').innerHTML = 
            '<p class="error-message">Error al cargar usuarios</p>';
    }
}

function renderUsuariosTable() {
    const container = document.getElementById('usuarios-table-container');
    
    if (usuarios.length === 0) {
        container.innerHTML = '<p class="text-center">No hay usuarios registrados</p>';
        return;
    }
    
    const html = `
        <table class="table">
            <thead>
                <tr>
                    <th>Usuario</th>
                    <th>Nombre Completo</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Último Acceso</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${usuarios.map(u => `
                    <tr>
                        <td>${u.username}</td>
                        <td>${u.nombre_completo || '-'}</td>
                        <td>${u.email}</td>
                        <td><span class="badge badge-${getRolClass(u.rol)}">${getRolLabel(u.rol)}</span></td>
                        <td><span class="badge badge-${u.activo ? 'success' : 'secondary'}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
                        <td>${formatDate(u.ultimo_acceso)}</td>
                        <td>
                            <button class="btn btn-sm btn-secondary" onclick="window.usuariosModule.viewUsuario(${u.id})">Ver Detalle</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

function showCreateModal() {
    document.getElementById('usuario-form').reset();
    document.getElementById('usuario-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('usuario-modal').style.display = 'none';
}

async function saveUsuario() {
    const form = document.getElementById('usuario-form');
    const formData = new FormData(form);
    
    const username = formData.get('username');
    const email = formData.get('email');
    const password = formData.get('password');
    const rol = formData.get('rol');
    
    if (!username || !email || !password || !rol) {
        alert('Usuario, email, contraseña y rol son requeridos');
        return;
    }
    
    if (password.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres');
        return;
    }
    
    const data = {
        username: username,
        email: email,
        password: password,
        nombre_completo: formData.get('nombre_completo') || null,
        rol: rol
    };
    
    try {
        await UsuariosAPI.create(data);
        closeModal();
        await loadUsuarios();
        alert('Usuario creado exitosamente');
    } catch (error) {
        console.error('Error saving usuario:', error);
        alert('Error al guardar usuario: ' + error.message);
    }
}

async function viewUsuario(id) {
    currentUsuarioId = id;
    
    const usuario = usuarios.find(u => u.id === id);
    if (!usuario) {
        alert('Usuario no encontrado');
        return;
    }
    
    document.getElementById('detail-modal-title').textContent = usuario.username;
    document.getElementById('usuario-detail-modal').style.display = 'flex';
    
    // Configurar navegación de tabs
    const tabBtns = document.querySelectorAll('#usuario-tabs .tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTabContent(btn.dataset.tab, usuario);
        });
    });
    
    // Mostrar tab inicial
    renderTabContent('info', usuario);
}

function closeDetailModal() {
    document.getElementById('usuario-detail-modal').style.display = 'none';
    currentUsuarioId = null;
}

async function renderTabContent(tab, usuario) {
    const container = document.getElementById('usuario-tabs-content');
    
    switch (tab) {
        case 'info':
            container.innerHTML = renderInfoTab(usuario);
            break;
        case 'sesiones':
            container.innerHTML = '<div class="flex-center" style="padding: 40px;"><div class="spinner"></div></div>';
            await renderSesionesTab(usuario.id);
            break;
        case 'estadisticas':
            container.innerHTML = '<div class="flex-center" style="padding: 40px;"><div class="spinner"></div></div>';
            await renderEstadisticasTab(usuario.id);
            break;
    }
}

function renderInfoTab(usuario) {
    return `
        <div class="tab-content-section">
            <h4>Información del Usuario</h4>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                <div>
                    <p><strong>Usuario:</strong> ${usuario.username}</p>
                    <p><strong>Email:</strong> ${usuario.email}</p>
                    <p><strong>Nombre Completo:</strong> ${usuario.nombre_completo || '-'}</p>
                </div>
                <div>
                    <p><strong>Rol:</strong> <span class="badge badge-${getRolClass(usuario.rol)}">${getRolLabel(usuario.rol)}</span></p>
                    <p><strong>Estado:</strong> <span class="badge badge-${usuario.activo ? 'success' : 'secondary'}">${usuario.activo ? 'Activo' : 'Inactivo'}</span></p>
                    <p><strong>Fecha Creación:</strong> ${formatDate(usuario.fecha_creacion)}</p>
                    <p><strong>Último Acceso:</strong> ${formatDate(usuario.ultimo_acceso)}</p>
                </div>
            </div>
            
            <hr>
            
            <h4>Permisos del Rol</h4>
            ${renderRolPermisos(usuario.rol)}
        </div>
    `;
}

function renderRolPermisos(rol) {
    const permisos = {
        'admin': [
            '✓ Acceso completo al sistema',
            '✓ Gestión de usuarios',
            '✓ Gestión de proveedores y artículos',
            '✓ Creación y edición de competencias',
            '✓ Creación y gestión de órdenes de compra',
            '✓ Exportación de datos',
            '✓ Visualización de reportes y estadísticas'
        ],
        'comprador': [
            '✓ Gestión de proveedores y artículos',
            '✓ Creación y edición de competencias',
            '✓ Creación y gestión de órdenes de compra',
            '✓ Exportación de datos',
            '✓ Visualización de reportes',
            '✗ Gestión de usuarios (solo lectura)'
        ],
        'visualizador': [
            '✓ Visualización de proveedores y artículos',
            '✓ Visualización de competencias',
            '✓ Visualización de órdenes de compra',
            '✓ Visualización de reportes',
            '✗ Creación o edición de datos',
            '✗ Gestión de usuarios'
        ]
    };
    
    const permisosList = permisos[rol] || [];
    
    return `
        <ul style="list-style: none; padding: 0;">
            ${permisosList.map(p => `
                <li style="padding: 5px 0; color: ${p.startsWith('✓') ? 'var(--success-color)' : 'var(--danger-color)'};">
                    ${p}
                </li>
            `).join('')}
        </ul>
    `;
}

async function renderSesionesTab(usuarioId) {
    const container = document.getElementById('usuario-tabs-content');
    
    try {
        const sesiones = await UsuariosAPI.getSesiones(usuarioId);
        
        if (sesiones.length === 0) {
            container.innerHTML = '<div class="tab-content-section"><p class="text-muted">No hay sesiones registradas</p></div>';
            return;
        }
        
        const html = `
            <div class="tab-content-section">
                <h4>Historial de Sesiones (Últimas 50)</h4>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Fecha Inicio</th>
                            <th>Fecha Fin</th>
                            <th>Duración</th>
                            <th>IP</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sesiones.map(s => `
                            <tr>
                                <td>${formatDateTime(s.fecha_inicio)}</td>
                                <td>${s.fecha_fin ? formatDateTime(s.fecha_fin) : 'En curso'}</td>
                                <td>${s.duracion_minutos ? s.duracion_minutos + ' min' : '-'}</td>
                                <td>${s.ip_address || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading sesiones:', error);
        container.innerHTML = '<div class="tab-content-section"><p class="error-message">Error al cargar sesiones</p></div>';
    }
}

async function renderEstadisticasTab(usuarioId) {
    const container = document.getElementById('usuario-tabs-content');
    
    try {
        const stats = await UsuariosAPI.getTiempoUso(usuarioId);
        
        const html = `
            <div class="tab-content-section">
                <h4>Estadísticas de Tiempo de Uso</h4>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 30px; margin-top: 20px;">
                    <div class="stat-card">
                        <div class="stat-icon">📊</div>
                        <div class="stat-content">
                            <h3>${stats.total_sesiones || 0}</h3>
                            <p>Total de Sesiones</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">⏱️</div>
                        <div class="stat-content">
                            <h3>${formatMinutes(stats.minutos_totales)}</h3>
                            <p>Tiempo Total de Uso</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📈</div>
                        <div class="stat-content">
                            <h3>${formatMinutes(stats.promedio_minutos)}</h3>
                            <p>Promedio por Sesión</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🔝</div>
                        <div class="stat-content">
                            <h3>${formatMinutes(stats.max_minutos)}</h3>
                            <p>Sesión Más Larga</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading estadisticas:', error);
        container.innerHTML = '<div class="tab-content-section"><p class="error-message">Error al cargar estadísticas</p></div>';
    }
}

// Funciones auxiliares
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR');
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR') + ' ' + date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function formatMinutes(minutes) {
    if (!minutes || minutes === 0) return '0 min';
    
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
}

function getRolClass(rol) {
    const classes = {
        'admin': 'danger',
        'comprador': 'primary',
        'visualizador': 'secondary'
    };
    return classes[rol] || 'secondary';
}

function getRolLabel(rol) {
    const labels = {
        'admin': 'Admin',
        'comprador': 'Comprador',
        'visualizador': 'Visualizador'
    };
    return labels[rol] || rol;
}

// Exportar funciones para uso global
window.usuariosModule = {
    showCreateModal,
    closeModal,
    saveUsuario,
    viewUsuario,
    closeDetailModal
};


