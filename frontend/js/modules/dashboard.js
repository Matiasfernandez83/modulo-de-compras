import { API } from '../api.js';

export async function initDashboard() {
    const contentArea = document.getElementById('content-area');
    
    contentArea.innerHTML = `
        <div class="dashboard-container">
            <div class="kpi-grid">
                <div class="kpi-card" id="kpi-card-proveedores" title="Doble click para ver detalle" style="cursor:pointer">
                    <div class="kpi-icon">👥</div>
                    <div class="kpi-content">
                        <h3 class="kpi-title">Proveedores Activos</h3>
                        <p class="kpi-value" id="kpi-proveedores">-</p>
                    </div>
                </div>
                <div class="kpi-card" id="kpi-card-articulos" title="Doble click para ver detalle" style="cursor:pointer">
                    <div class="kpi-icon">📦</div>
                    <div class="kpi-content">
                        <h3 class="kpi-title">Artículos en Catálogo</h3>
                        <p class="kpi-value" id="kpi-articulos">-</p>
                    </div>
                </div>
                <div class="kpi-card" id="kpi-card-competencias" title="Doble click para ver detalle" style="cursor:pointer">
                    <div class="kpi-icon">⚖️</div>
                    <div class="kpi-content">
                        <h3 class="kpi-title">Competencias Activas</h3>
                        <p class="kpi-value" id="kpi-competencias">-</p>
                    </div>
                </div>
                <div class="kpi-card" id="kpi-card-ordenes" title="Doble click para ver detalle" style="cursor:pointer">
                    <div class="kpi-icon">📋</div>
                    <div class="kpi-content">
                        <h3 class="kpi-title">Órdenes Este Mes</h3>
                        <p class="kpi-value" id="kpi-ordenes">-</p>
                    </div>
                </div>
                <div class="kpi-card" id="kpi-card-listas" title="Doble click para ver detalle" style="cursor:pointer">
                    <div class="kpi-icon">💰</div>
                    <div class="kpi-content">
                        <h3 class="kpi-title">Listas de Precios</h3>
                        <p class="kpi-value" id="kpi-listas">-</p>
                    </div>
                </div>
                <div class="kpi-card" id="kpi-card-usuarios" title="Doble click para ver detalle" style="cursor:pointer">
                    <div class="kpi-icon">👤</div>
                    <div class="kpi-content">
                        <h3 class="kpi-title">Usuarios Activos</h3>
                        <p class="kpi-value" id="kpi-usuarios">-</p>
                    </div>
                </div>
            </div>
            
            <div class="charts-grid">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Órdenes de Compra - Últimos 6 Meses</h3>
                    </div>
                    <div class="card-body">
                        <canvas id="monthly-orders-chart"></canvas>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Actividad Reciente</h3>
                    </div>
                    <div class="card-body">
                        <div id="recent-activity" class="activity-feed"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal detalle KPI -->
        <div id="kpi-detail-modal" class="modal-overlay" style="display:none">
            <div class="modal modal-lg">
                <div class="modal-header">
                    <h3 class="modal-title" id="kpi-modal-title">Detalle</h3>
                    <button class="modal-close" onclick="document.getElementById('kpi-detail-modal').style.display='none'">&times;</button>
                </div>
                <div class="modal-body" id="kpi-modal-body">
                    <div class="flex-center"><div class="spinner"></div></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="document.getElementById('kpi-detail-modal').style.display='none'">Cerrar</button>
                </div>
            </div>
        </div>
    `;
    
    await loadDashboardStats();
    await loadMonthlyOrdersChart();
    await loadRecentActivity();
    setupKpiDoubleClick();
}

function setupKpiDoubleClick() {
    const handlers = {
        'kpi-card-proveedores': () => showKpiDetail('Proveedores Activos', loadProveedoresDetail),
        'kpi-card-articulos':   () => showKpiDetail('Artículos en Catálogo', loadArticulosDetail),
        'kpi-card-competencias':() => showKpiDetail('Competencias Activas', loadCompetenciasDetail),
        'kpi-card-ordenes':     () => showKpiDetail('Órdenes Este Mes', loadOrdenesDetail),
        'kpi-card-listas':      () => showKpiDetail('Listas de Precios', loadListasDetail),
        'kpi-card-usuarios':    () => showKpiDetail('Usuarios Activos', loadUsuariosDetail),
    };
    for (const [id, fn] of Object.entries(handlers)) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('dblclick', fn);
    }
}

async function showKpiDetail(title, loaderFn) {
    const modal = document.getElementById('kpi-detail-modal');
    document.getElementById('kpi-modal-title').textContent = title;
    document.getElementById('kpi-modal-body').innerHTML = '<div class="flex-center" style="padding:30px"><div class="spinner"></div></div>';
    modal.style.display = 'flex';
    const html = await loaderFn();
    document.getElementById('kpi-modal-body').innerHTML = html;
}

async function loadProveedoresDetail() {
    try {
        const data = await API.get('/proveedores');
        if (!data.length) return '<p class="text-muted text-center">Sin proveedores activos</p>';
        return `<table class="table">
            <thead><tr><th>Nombre</th><th>Teléfono</th><th>Email</th><th>Forma de Pago</th><th>Tiempo Entrega</th></tr></thead>
            <tbody>${data.map(p => `<tr>
                <td><strong>${p.nombre}</strong></td>
                <td>${p.telefono || '-'}</td>
                <td>${p.email ? `<a href="mailto:${p.email}">${p.email}</a>` : '-'}</td>
                <td>${p.forma_pago || '-'}</td>
                <td>${p.tiempo_entrega ? p.tiempo_entrega + ' días' : '-'}</td>
            </tr>`).join('')}</tbody>
        </table>`;
    } catch { return '<p class="error-message">Error al cargar proveedores</p>'; }
}

async function loadArticulosDetail() {
    try {
        const data = await API.get('/articulos');
        if (!data.length) return '<p class="text-muted text-center">Sin artículos</p>';
        return `<table class="table">
            <thead><tr><th>Código</th><th>Nombre</th><th>Categoría</th><th>Unidad</th></tr></thead>
            <tbody>${data.map(a => `<tr>
                <td>${a.codigo_interno}</td>
                <td>${a.nombre || a.descripcion}</td>
                <td>${a.categoria || '-'}</td>
                <td>${a.unidad_medida || '-'}</td>
            </tr>`).join('')}</tbody>
        </table>`;
    } catch { return '<p class="error-message">Error al cargar artículos</p>'; }
}

async function loadCompetenciasDetail() {
    try {
        const data = await API.get('/competencia');
        const activas = data.filter(c => c.estado !== 'confirmada' && c.estado !== 'cancelada');
        if (!activas.length) return '<p class="text-muted text-center">Sin competencias activas</p>';
        return `<table class="table">
            <thead><tr><th>Nombre</th><th>Estado</th><th>Fecha Inicio</th><th>Fecha Fin</th></tr></thead>
            <tbody>${activas.map(c => `<tr>
                <td>${c.nombre}</td>
                <td><span class="badge badge-${c.estado === 'borrador' ? 'warning' : 'success'}">${c.estado}</span></td>
                <td>${c.fecha_inicio_periodo ? new Date(c.fecha_inicio_periodo).toLocaleDateString('es-AR') : '-'}</td>
                <td>${c.fecha_fin_periodo ? new Date(c.fecha_fin_periodo).toLocaleDateString('es-AR') : '-'}</td>
            </tr>`).join('')}</tbody>
        </table>`;
    } catch { return '<p class="error-message">Error al cargar competencias</p>'; }
}

async function loadOrdenesDetail() {
    try {
        const data = await API.get('/ordenes-compra');
        const now = new Date();
        const mesActual = data.filter(o => {
            const f = new Date(o.fecha_emision || o.fecha_creacion);
            return f.getMonth() === now.getMonth() && f.getFullYear() === now.getFullYear();
        });
        if (!mesActual.length) return '<p class="text-muted text-center">Sin órdenes este mes</p>';
        return `<table class="table">
            <thead><tr><th>Número</th><th>Proveedor</th><th>Fecha</th><th>Estado</th><th>Total</th></tr></thead>
            <tbody>${mesActual.map(o => `<tr>
                <td>${o.numero || o.id}</td>
                <td>${o.proveedor || '-'}</td>
                <td>${o.fecha_emision ? new Date(o.fecha_emision).toLocaleDateString('es-AR') : '-'}</td>
                <td><span class="badge badge-info">${o.estado || '-'}</span></td>
                <td>$${(o.total || 0).toLocaleString('es-AR')}</td>
            </tr>`).join('')}</tbody>
        </table>`;
    } catch { return '<p class="error-message">Error al cargar órdenes</p>'; }
}

async function loadListasDetail() {
    try {
        const data = await API.get('/listas-precios');
        if (!data.length) return '<p class="text-muted text-center">Sin listas de precios</p>';
        return `<table class="table">
            <thead><tr><th>Nombre</th><th>Proveedor</th><th>Moneda</th><th>Vigencia</th></tr></thead>
            <tbody>${data.map(l => `<tr>
                <td>${l.nombre}</td>
                <td>${l.proveedor_nombre || '-'}</td>
                <td>${l.moneda || 'PESOS'}</td>
                <td>${l.fecha_vigencia ? new Date(l.fecha_vigencia).toLocaleDateString('es-AR') : '-'}</td>
            </tr>`).join('')}</tbody>
        </table>`;
    } catch { return '<p class="error-message">Error al cargar listas</p>'; }
}

async function loadUsuariosDetail() {
    try {
        const data = await API.get('/usuarios');
        if (!data.length) return '<p class="text-muted text-center">Sin usuarios</p>';
        return `<table class="table">
            <thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Último Acceso</th></tr></thead>
            <tbody>${data.map(u => `<tr>
                <td>${u.username}</td>
                <td>${u.nombre_completo || '-'}</td>
                <td><span class="badge badge-info">${u.rol}</span></td>
                <td>${u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleDateString('es-AR') : '-'}</td>
            </tr>`).join('')}</tbody>
        </table>`;
    } catch { return '<p class="error-message">Error al cargar usuarios</p>'; }
}

async function loadDashboardStats() {
    try {
        const stats = await API.get('/dashboard/stats');
        document.getElementById('kpi-proveedores').textContent = stats.proveedores_activos;
        document.getElementById('kpi-articulos').textContent = stats.articulos_catalogo;
        document.getElementById('kpi-competencias').textContent = stats.competencias_activas;
        document.getElementById('kpi-ordenes').textContent = stats.ordenes_mes;
        document.getElementById('kpi-listas').textContent = stats.listas_activas;
        document.getElementById('kpi-usuarios').textContent = stats.usuarios_activos;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

async function loadMonthlyOrdersChart() {
    try {
        const data = await API.get('/dashboard/charts/monthly-orders');
        const ctx = document.getElementById('monthly-orders-chart').getContext('2d');
        if (typeof Chart !== 'undefined') {
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.map(d => d.mes),
                    datasets: [{
                        label: 'Órdenes de Compra',
                        data: data.map(d => d.total),
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
        }
    } catch (error) {
        console.error('Error loading monthly orders chart:', error);
    }
}

async function loadRecentActivity() {
    try {
        const activities = await API.get('/dashboard/recent-activity');
        const container = document.getElementById('recent-activity');
        if (activities.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay actividad reciente</p>';
            return;
        }
        const icons = { orden_compra: '📋', competencia: '⚖️', lista_precios: '💰' };
        const labels = { orden_compra: 'Orden de Compra', competencia: 'Competencia', lista_precios: 'Lista de Precios' };
        let html = '<div class="activity-list">';
        activities.forEach(a => {
            const icon = icons[a.tipo] || '📄';
            const label = labels[a.tipo] || a.tipo;
            const date = new Date(a.fecha);
            const days = Math.floor((new Date() - date) / 86400000);
            const fechaStr = days === 0 ? 'Hoy' : days === 1 ? 'Ayer' : days < 7 ? `Hace ${days} días` : date.toLocaleDateString('es-AR');
            html += `<div class="activity-item">
                <div class="activity-icon">${icon}</div>
                <div class="activity-content">
                    <p class="activity-title">${label}: ${a.detalle}</p>
                    ${a.relacionado ? `<p class="activity-subtitle">${a.relacionado}</p>` : ''}
                    <p class="activity-date">${fechaStr}</p>
                </div>
            </div>`;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}


