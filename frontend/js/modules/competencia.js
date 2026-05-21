// Módulo de Competencia
import { CompetenciaAPI, ProveedoresAPI, API } from '../api.js';

let competencias = [];
let currentCompetenciaId = null;

export async function initCompetencia() {
    renderCompetenciaView();
    await loadCompetencias();
}

function renderCompetenciaView() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Competencias de Precios</h2>
                <button class="btn btn-primary" onclick="window.competenciaModule.showCreateModal()">
                    + Nueva Competencia
                </button>
            </div>
            <div class="card-body">
                <div id="competencias-table-container">
                    <div class="flex-center" style="padding: 40px;">
                        <div class="spinner"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal para crear competencia -->
        <div id="competencia-modal" class="modal-overlay" style="display: none;">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Nueva Competencia</h3>
                    <button class="modal-close" onclick="window.competenciaModule.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="competencia-form">
                        <div class="form-group">
                            <label for="nombre">Nombre *</label>
                            <input type="text" id="nombre" name="nombre" required>
                        </div>
                        <div class="form-group">
                            <label for="origen">Origen</label>
                            <select id="origen" name="origen">
                                <option value="">Seleccione...</option>
                                <option value="planificacion">Planificación</option>
                                <option value="manual">Manual</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="fecha_inicio_periodo">Fecha Inicio Período</label>
                            <input type="date" id="fecha_inicio_periodo" name="fecha_inicio_periodo">
                        </div>
                        <div class="form-group">
                            <label for="fecha_fin_periodo">Fecha Fin Período</label>
                            <input type="date" id="fecha_fin_periodo" name="fecha_fin_periodo">
                        </div>
                        <div class="form-group">
                            <label for="proveedores">Proveedores *</label>
                            <div id="proveedores-checkboxes" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; border-radius: 4px;">
                                <p class="text-muted">Cargando proveedores...</p>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="window.competenciaModule.closeModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="window.competenciaModule.saveCompetencia()">Crear</button>
                </div>
            </div>
        </div>

        <!-- Modal para vista detallada con tabs -->
        <div id="competencia-detail-modal" class="modal-overlay" style="display: none;">
            <div class="modal" style="max-width: 95%; width: 1200px;">
                <div class="modal-header">
                    <h3 class="modal-title" id="detail-modal-title">Competencia</h3>
                    <button class="modal-close" onclick="window.competenciaModule.closeDetailModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <!-- Tabs de navegación -->
                    <div class="tabs-container">
                        <div class="tabs-nav" id="competencia-tabs">
                            <button class="tab-btn active" data-tab="resumen">Resumen</button>
                            <button class="tab-btn" data-tab="proveedores">Proveedores</button>
                            <button class="tab-btn" data-tab="articulos">Artículos</button>
                            <button class="tab-btn" data-tab="comparacion">Comparación</button>
                            <button class="tab-btn" data-tab="condiciones">Condiciones</button>
                            <button class="tab-btn" data-tab="categorias">Por Categoría</button>
                            <button class="tab-btn" data-tab="mejores">Mejores Precios</button>
                            <button class="tab-btn" data-tab="totales">Totales</button>
                            <button class="tab-btn" data-tab="observaciones">Observaciones</button>
                            <button class="tab-btn" data-tab="historial">Historial</button>
                            <button class="tab-btn" data-tab="documentos">Documentos</button>
                            <button class="tab-btn" data-tab="acciones">Acciones</button>
                        </div>
                        <div class="tabs-content" id="competencia-tabs-content">
                            <!-- El contenido se cargará dinámicamente -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    setupTabNavigation();
}

function setupTabNavigation() {
    // Se configurará cuando se abra el modal de detalle
}

async function loadCompetencias() {
    try {
        competencias = await CompetenciaAPI.getAll();
        renderCompetenciasTable();
    } catch (error) {
        console.error('Error loading competencias:', error);
        document.getElementById('competencias-table-container').innerHTML = 
            '<p class="error-message">Error al cargar competencias</p>';
    }
}

function renderCompetenciasTable() {
    const container = document.getElementById('competencias-table-container');
    
    if (competencias.length === 0) {
        container.innerHTML = '<p class="text-center">No hay competencias registradas</p>';
        return;
    }
    
    const html = `
        <table class="table">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Origen</th>
                    <th>Período</th>
                    <th>Estado</th>
                    <th>Fecha Creación</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${competencias.map(c => `
                    <tr>
                        <td>${c.nombre}</td>
                        <td>${c.origen || '-'}</td>
                        <td>${formatPeriodo(c.fecha_inicio_periodo, c.fecha_fin_periodo)}</td>
                        <td><span class="badge badge-${getEstadoClass(c.estado)}">${c.estado || 'borrador'}</span></td>
                        <td>${formatDate(c.fecha_creacion)}</td>
                        <td>
                            <button class="btn btn-sm btn-secondary" onclick="window.competenciaModule.viewCompetencia(${c.id})">Ver Detalle</button>
                            <button class="btn btn-sm btn-primary" onclick="window.competenciaModule.exportCompetencia(${c.id})">Exportar</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

async function showCreateModal() {
    // Cargar proveedores
    try {
        const proveedores = await ProveedoresAPI.getAll();
        const container = document.getElementById('proveedores-checkboxes');
        
        if (proveedores.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay proveedores disponibles</p>';
        } else {
            container.innerHTML = proveedores.map(p => `
                <div style="margin-bottom: 8px;">
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="checkbox" name="proveedores" value="${p.id}" style="margin-right: 8px;">
                        ${p.nombre}
                    </label>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading proveedores:', error);
    }
    
    document.getElementById('competencia-form').reset();
    document.getElementById('competencia-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('competencia-modal').style.display = 'none';
}

async function saveCompetencia() {
    const form = document.getElementById('competencia-form');
    const formData = new FormData(form);
    
    const nombre = formData.get('nombre');
    if (!nombre) {
        alert('El nombre es requerido');
        return;
    }
    
    // Obtener proveedores seleccionados
    const proveedoresCheckboxes = document.querySelectorAll('input[name="proveedores"]:checked');
    const proveedores = Array.from(proveedoresCheckboxes).map(cb => parseInt(cb.value));
    
    if (proveedores.length === 0) {
        alert('Debe seleccionar al menos un proveedor');
        return;
    }
    
    const data = {
        nombre: nombre,
        origen: formData.get('origen') || null,
        fecha_inicio_periodo: formData.get('fecha_inicio_periodo') || null,
        fecha_fin_periodo: formData.get('fecha_fin_periodo') || null,
        proveedores: proveedores
    };
    
    try {
        await CompetenciaAPI.create(data);
        closeModal();
        await loadCompetencias();
        alert('Competencia creada exitosamente');
    } catch (error) {
        console.error('Error saving competencia:', error);
        alert('Error al guardar competencia: ' + error.message);
    }
}

async function viewCompetencia(id) {
    currentCompetenciaId = id;
    
    try {
        const competencia = await CompetenciaAPI.getById(id);
        
        document.getElementById('detail-modal-title').textContent = competencia.nombre;
        document.getElementById('competencia-detail-modal').style.display = 'flex';
        
        // Configurar navegación de tabs
        const tabBtns = document.querySelectorAll('#competencia-tabs .tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderTabContent(btn.dataset.tab, competencia);
            });
        });
        
        // Mostrar tab inicial
        renderTabContent('resumen', competencia);
    } catch (error) {
        console.error('Error loading competencia:', error);
        alert('Error al cargar competencia');
    }
}

function closeDetailModal() {
    document.getElementById('competencia-detail-modal').style.display = 'none';
    currentCompetenciaId = null;
}

function renderTabContent(tab, competencia) {
    const container = document.getElementById('competencia-tabs-content');
    
    switch (tab) {
        case 'resumen':
            container.innerHTML = renderResumenTab(competencia);
            break;
        case 'proveedores':
            container.innerHTML = renderProveedoresTab(competencia);
            break;
        case 'articulos':
            container.innerHTML = renderArticulosTab(competencia);
            break;
        case 'comparacion':
            container.innerHTML = renderComparacionTab(competencia);
            break;
        case 'condiciones':
            container.innerHTML = renderCondicionesTab(competencia);
            break;
        case 'categorias':
            container.innerHTML = renderCategoriasTab(competencia);
            break;
        case 'mejores':
            container.innerHTML = renderMejoresTab(competencia);
            break;
        case 'totales':
            container.innerHTML = renderTotalesTab(competencia);
            break;
        case 'observaciones':
            container.innerHTML = renderObservacionesTab(competencia);
            break;
        case 'historial':
            container.innerHTML = renderHistorialTab(competencia);
            break;
        case 'documentos':
            container.innerHTML = renderDocumentosTab(competencia);
            break;
        case 'acciones':
            container.innerHTML = renderAccionesTab(competencia);
            break;
    }
}

function renderResumenTab(competencia) {
    return `
        <div class="tab-content-section">
            <h4>Información General</h4>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                <div>
                    <p><strong>Nombre:</strong> ${competencia.nombre}</p>
                    <p><strong>Origen:</strong> ${competencia.origen || '-'}</p>
                    <p><strong>Estado:</strong> <span class="badge badge-${getEstadoClass(competencia.estado)}">${competencia.estado || 'borrador'}</span></p>
                </div>
                <div>
                    <p><strong>Período:</strong> ${formatPeriodo(competencia.fecha_inicio_periodo, competencia.fecha_fin_periodo)}</p>
                    <p><strong>Fecha Creación:</strong> ${formatDate(competencia.fecha_creacion)}</p>
                    <p><strong>Proveedores:</strong> ${competencia.proveedores?.length || 0}</p>
                </div>
            </div>
        </div>
    `;
}

function renderProveedoresTab(competencia) {
    if (!competencia.proveedores || competencia.proveedores.length === 0) {
        return '<p class="text-muted">No hay proveedores en esta competencia</p>';
    }
    
    return `
        <div class="tab-content-section">
            <h4>Proveedores Participantes</h4>
            <table class="table">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Forma de Pago</th>
                        <th>Plazo Pago</th>
                        <th>Tiempo Entrega</th>
                        <th>Seleccionado</th>
                    </tr>
                </thead>
                <tbody>
                    ${competencia.proveedores.map(p => `
                        <tr>
                            <td>${p.nombre}</td>
                            <td>${p.forma_pago || '-'}</td>
                            <td>${p.plazo_pago ? p.plazo_pago + ' días' : '-'}</td>
                            <td>${p.tiempo_entrega ? p.tiempo_entrega + ' días' : '-'}</td>
                            <td>${p.seleccionado ? '✓' : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderArticulosTab(competencia) {
    if (!competencia.items_por_categoria) {
        return '<p class="text-muted">No hay artículos en esta competencia</p>';
    }
    
    const categorias = Object.keys(competencia.items_por_categoria);
    
    return `
        <div class="tab-content-section">
            <h4>Artículos por Categoría</h4>
            ${categorias.map(cat => `
                <div style="margin-bottom: 30px;">
                    <h5>${cat}</h5>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Artículo</th>
                                <th>Cantidad</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${competencia.items_por_categoria[cat].map(item => `
                                <tr>
                                    <td>${item.codigo_interno}</td>
                                    <td>${item.articulo_nombre}</td>
                                    <td>${item.cantidad || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `).join('')}
        </div>
    `;
}

function renderComparacionTab(competencia) {
    return `
        <div class="tab-content-section">
            <h4>Comparación de Precios con Semáforos</h4>
            <p class="text-muted">Sistema de semáforos: <span class="badge badge-success">Verde = Mejor precio</span> <span class="badge badge-warning">Amarillo = Precio intermedio</span> <span class="badge badge-danger">Rojo = Precio alto</span></p>
            <p class="text-muted">Nota: Esta funcionalidad requiere datos de precios por proveedor. Actualmente en desarrollo.</p>
        </div>
    `;
}

function renderCondicionesTab(competencia) {
    if (!competencia.proveedores || competencia.proveedores.length === 0) {
        return '<p class="text-muted">No hay proveedores para mostrar condiciones</p>';
    }
    
    return `
        <div class="tab-content-section">
            <h4>Condiciones Comerciales por Proveedor</h4>
            <table class="table">
                <thead>
                    <tr>
                        <th>Proveedor</th>
                        <th>Forma de Pago</th>
                        <th>Plazo de Pago</th>
                        <th>Tiempo de Entrega</th>
                    </tr>
                </thead>
                <tbody>
                    ${competencia.proveedores.map(p => `
                        <tr>
                            <td>${p.nombre}</td>
                            <td>${p.forma_pago || '-'}</td>
                            <td>${p.plazo_pago ? p.plazo_pago + ' días' : '-'}</td>
                            <td>${p.tiempo_entrega ? p.tiempo_entrega + ' días' : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderCategoriasTab(competencia) {
    return renderArticulosTab(competencia);
}

function renderMejoresTab(competencia) {
    return `
        <div class="tab-content-section">
            <h4>Ranking de Mejores Precios por Item</h4>
            <p class="text-muted">Esta funcionalidad requiere datos de precios detallados. Actualmente en desarrollo.</p>
        </div>
    `;
}

function renderTotalesTab(competencia) {
    return `
        <div class="tab-content-section">
            <h4>Totales por Proveedor</h4>
            <p class="text-muted">Esta funcionalidad requiere datos de precios detallados. Actualmente en desarrollo.</p>
        </div>
    `;
}

function renderObservacionesTab(competencia) {
    return `
        <div class="tab-content-section">
            <h4>Observaciones y Comentarios</h4>
            <textarea class="form-control" rows="6" placeholder="Agregar observaciones..."></textarea>
            <button class="btn btn-primary" style="margin-top: 10px;">Guardar Observaciones</button>
        </div>
    `;
}

function renderHistorialTab(competencia) {
    return `
        <div class="tab-content-section">
            <h4>Historial de Cambios</h4>
            <p class="text-muted">No hay cambios registrados</p>
        </div>
    `;
}

function renderDocumentosTab(competencia) {
    return `
        <div class="tab-content-section">
            <h4>Documentos Adjuntos</h4>
            <input type="file" class="form-control" multiple>
            <button class="btn btn-primary" style="margin-top: 10px;">Subir Documentos</button>
            <hr>
            <p class="text-muted">No hay documentos adjuntos</p>
        </div>
    `;
}

function renderAccionesTab(competencia) {
    const isConfirmada = competencia.estado === 'confirmada';
    
    return `
        <div class="tab-content-section">
            <h4>Acciones Disponibles</h4>
            <div style="display: flex; flex-direction: column; gap: 15px; max-width: 400px;">
                ${!isConfirmada ? `
                    <button class="btn btn-success" onclick="window.competenciaModule.confirmarCompetencia(${competencia.id})">
                        ✓ Confirmar Competencia
                    </button>
                ` : '<p class="text-success">✓ Competencia confirmada</p>'}
                <button class="btn btn-primary" onclick="window.competenciaModule.exportCompetencia(${competencia.id})">
                    📥 Exportar a Excel
                </button>
                <button class="btn btn-secondary" onclick="window.competenciaModule.generarOrdenCompra(${competencia.id})">
                    📋 Generar Orden de Compra
                </button>
            </div>
        </div>
    `;
}

async function confirmarCompetencia(id) {
    if (!confirm('¿Está seguro de confirmar esta competencia?')) {
        return;
    }
    
    try {
        await CompetenciaAPI.confirmar(id);
        alert('Competencia confirmada exitosamente');
        closeDetailModal();
        await loadCompetencias();
    } catch (error) {
        console.error('Error confirming competencia:', error);
        alert('Error al confirmar competencia');
    }
}

async function exportCompetencia(id) {
    try {
        const url = `${API.baseURL}/export/competencia/${id}`;
        const token = localStorage.getItem('access_token');
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al exportar');
        }
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `competencia_${id}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        
        alert('Competencia exportada exitosamente');
    } catch (error) {
        console.error('Error exporting competencia:', error);
        alert('Error al exportar competencia');
    }
}

function generarOrdenCompra(id) {
    alert('Funcionalidad de generar orden de compra en desarrollo');
}

// Funciones auxiliares
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR');
}

function formatPeriodo(inicio, fin) {
    if (!inicio && !fin) return '-';
    if (!inicio) return `Hasta ${formatDate(fin)}`;
    if (!fin) return `Desde ${formatDate(inicio)}`;
    return `${formatDate(inicio)} - ${formatDate(fin)}`;
}

function getEstadoClass(estado) {
    const classes = {
        'borrador': 'secondary',
        'confirmada': 'success',
        'cancelada': 'danger'
    };
    return classes[estado] || 'secondary';
}

// Exportar funciones para uso global
window.competenciaModule = {
    showCreateModal,
    closeModal,
    saveCompetencia,
    viewCompetencia,
    closeDetailModal,
    confirmarCompetencia,
    exportCompetencia,
    generarOrdenCompra
};
