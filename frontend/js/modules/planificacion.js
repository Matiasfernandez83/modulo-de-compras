// Módulo de planificación con detalle, carga masiva Excel y template descargable
import { API, ArticulosAPI } from '../api.js';

let planificaciones = [];
let articulos = [];
let currentPlanId = null;

export async function initPlanificacion() {
    renderPlanificacionView();
    await loadPlanificaciones();
    await loadArticulos();
}

function renderPlanificacionView() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Planificación de Compras</h2>
                <div style="display:flex; gap:8px; flex-wrap:wrap">
                    <a href="http://localhost:3000/api/planificacion/template"
                       class="btn btn-secondary" download title="Descargar planilla Excel">
                        📥 Descargar Template Excel
                    </a>
                    <button class="btn btn-primary" onclick="window.planificacionModule.showCreateModal()">
                        + Nueva Planificación
                    </button>
                </div>
            </div>
            <p style="padding:8px 16px; margin:0; color:#666; font-size:0.85rem">
                💡 <strong>Click en el nombre</strong> de una planificación para ver sus artículos y cargar ítems masivamente
            </p>
            <div class="card-body">
                <div id="planificaciones-table-container">
                    <div class="flex-center" style="padding: 40px;">
                        <div class="spinner"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal detalle planificación con ítems -->
        <div id="plan-detalle-modal" class="modal-overlay" style="display:none">
            <div class="modal modal-lg">
                <div class="modal-header">
                    <h3 class="modal-title" id="plan-detalle-titulo">Detalle de Planificación</h3>
                    <button class="modal-close" onclick="document.getElementById('plan-detalle-modal').style.display='none'">&times;</button>
                </div>
                <div class="modal-body" id="plan-detalle-body">
                    <div class="flex-center"><div class="spinner"></div></div>
                </div>
                <div class="modal-footer" style="gap:8px; flex-wrap:wrap">
                    <button class="btn btn-secondary" onclick="window.planificacionModule.showImportModal()">📤 Importar Items Excel</button>
                    <button class="btn btn-secondary" onclick="window.planificacionModule.showItemsModal()">+ Agregar Artículo</button>
                    <button class="btn btn-secondary" onclick="document.getElementById('plan-detalle-modal').style.display='none'">Cerrar</button>
                </div>
            </div>
        </div>

        <!-- Modal Importar Excel para planificación -->
        <div id="plan-import-modal" class="modal-overlay" style="display:none">
            <div class="modal">
                <div class="modal-header">
                    <h3>Importar Artículos desde Excel</h3>
                    <button class="modal-close" onclick="window.planificacionModule.closeImportModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="upload-area" id="plan-upload-area">
                        <div class="upload-icon">📁</div>
                        <p><strong>Arrastrá tu archivo Excel aquí</strong></p>
                        <p>o hacé click para seleccionar</p>
                        <input type="file" id="plan-file-input" accept=".xlsx,.xls" style="display:none">
                        <button class="btn btn-secondary" onclick="document.getElementById('plan-file-input').click()">
                            Seleccionar Archivo
                        </button>
                    </div>
                    <div style="margin-top:12px; text-align:center">
                        <a href="http://localhost:3000/api/planificacion/template" download class="btn btn-secondary btn-sm">
                            📥 Descargar Template
                        </a>
                    </div>
                    <div id="plan-upload-result" style="margin-top:16px"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="window.planificacionModule.closeImportModal()">Cerrar</button>
                </div>
            </div>
        </div>

        <!-- Modal crear planificación -->
        <div id="planificacion-modal" class="modal-overlay" style="display: none;">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Nueva Planificación</h3>
                    <button class="modal-close" onclick="window.planificacionModule.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="planificacion-form">
                        <div class="form-group">
                            <label for="plan-nombre">Nombre *</label>
                            <input type="text" id="plan-nombre" name="nombre" required>
                        </div>
                        <div class="form-group">
                            <label for="plan-descripcion">Descripción</label>
                            <textarea id="plan-descripcion" name="descripcion" rows="3"></textarea>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
                            <div class="form-group">
                                <label for="plan-fecha-inicio">Fecha Inicio *</label>
                                <input type="date" id="plan-fecha-inicio" name="fecha_inicio" required>
                            </div>
                            <div class="form-group">
                                <label for="plan-fecha-fin">Fecha Fin *</label>
                                <input type="date" id="plan-fecha-fin" name="fecha_fin" required>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="window.planificacionModule.closeModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="window.planificacionModule.savePlanificacion()">Guardar</button>
                </div>
            </div>
        </div>

        <!-- Modal agregar artículo individual -->
        <div id="items-modal" class="modal-overlay" style="display: none;">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Agregar Artículo a Planificación</h3>
                    <button class="modal-close" onclick="window.planificacionModule.closeItemsModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="items-form">
                        <div class="form-group">
                            <label for="articulo_id">Artículo *</label>
                            <select id="articulo_id" name="articulo_id" required>
                                <option value="">Seleccione un artículo...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="cantidad_estimada">Cantidad Estimada *</label>
                            <input type="number" id="cantidad_estimada" name="cantidad_estimada" min="1" required>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="window.planificacionModule.closeItemsModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="window.planificacionModule.addItem()">Agregar</button>
                </div>
            </div>
        </div>
    `;

    setupPlanUploadDnD();
}

async function loadPlanificaciones() {
    try {
        planificaciones = await API.get('/planificacion');
        renderPlanificacionesTable();
    } catch (error) {
        console.error('Error loading planificaciones:', error);
        showError('Error al cargar planificaciones');
    }
}

async function loadArticulos() {
    try {
        articulos = await ArticulosAPI.getAll();
        updateArticulosSelect();
    } catch (e) { console.error(e); }
}

function updateArticulosSelect() {
    const select = document.getElementById('articulo_id');
    if (!select) return;
    select.innerHTML = '<option value="">Seleccione un artículo...</option>';
    articulos.forEach(art => {
        const opt = document.createElement('option');
        opt.value = art.id;
        opt.textContent = `${art.codigo_interno} — ${art.nombre || art.descripcion}`;
        select.appendChild(opt);
    });
}

function renderPlanificacionesTable() {
    const container = document.getElementById('planificaciones-table-container');

    if (planificaciones.length === 0) {
        container.innerHTML = '<p class="text-center">No hay planificaciones registradas</p>';
        return;
    }

    container.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Nombre</th><th>Descripción</th>
                    <th>Fecha Inicio</th><th>Fecha Fin</th>
                    <th>Estado</th><th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${planificaciones.map(p => {
                    const estado = getEstado(p);
                    return `<tr>
                        <td>
                            <span style="color:var(--primary-color);cursor:pointer;font-weight:500"
                                  onclick="window.planificacionModule.verDetalle(${p.id})"
                                  title="Click para ver artículos de esta planificación">
                                ${p.nombre}
                            </span>
                        </td>
                        <td>${p.descripcion || '-'}</td>
                        <td>${formatDate(p.fecha_inicio)}</td>
                        <td>${formatDate(p.fecha_fin)}</td>
                        <td><span class="badge badge-${estado.class}">${estado.text}</span></td>
                        <td style="display:flex; gap:6px; flex-wrap:wrap">
                            <button class="btn btn-sm btn-secondary" onclick="window.planificacionModule.verDetalle(${p.id})">
                                👁 Ver / + Artículos
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="window.planificacionModule.showImportModal(${p.id})" title="Importar ítems desde Excel">
                                📤 Importar Excel
                            </button>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
    `;
}

async function verDetalle(planId) {
    currentPlanId = planId;
    const plan = planificaciones.find(p => p.id === planId);
    if (!plan) return;

    document.getElementById('plan-detalle-titulo').textContent = plan.nombre;
    document.getElementById('plan-detalle-body').innerHTML =
        '<div class="flex-center" style="padding:30px"><div class="spinner"></div></div>';
    document.getElementById('plan-detalle-modal').style.display = 'flex';

    try {
        const detalle = await API.get(`/planificacion/${planId}`);

        const infoEstado = getEstado(detalle);
        const cabecera = `
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px; margin-bottom:16px">
                <div><strong>Estado:</strong> <span class="badge badge-${infoEstado.class}">${infoEstado.text}</span></div>
                <div><strong>Inicio:</strong> ${formatDate(detalle.fecha_inicio)}</div>
                <div><strong>Fin:</strong> ${formatDate(detalle.fecha_fin)}</div>
                <div><strong>Total artículos:</strong> ${detalle.total_items}</div>
            </div>`;

        const tablaItems = (detalle.items || []).length === 0
            ? '<p class="text-muted">Sin artículos cargados. Use "+ Agregar Artículo" o importe un Excel con el template.</p>'
            : `<table class="table">
                <thead><tr>
                    <th>Código</th><th>Artículo</th><th>Categoría</th>
                    <th>Unidad</th><th>Cantidad Requerida</th>
                </tr></thead>
                <tbody>
                    ${detalle.items.map(it => `<tr>
                        <td>${it.codigo_interno}</td>
                        <td>${it.nombre}</td>
                        <td>${it.categoria || '-'}</td>
                        <td>${it.unidad_medida || '-'}</td>
                        <td><strong>${it.cantidad_requerida || 0}</strong></td>
                    </tr>`).join('')}
                </tbody>
               </table>`;

        document.getElementById('plan-detalle-body').innerHTML = `
            ${cabecera}
            ${plan.descripcion ? `<p style="color:#666; margin-bottom:16px">${plan.descripcion}</p>` : ''}
            <h4 style="border-bottom:2px solid var(--primary-color); padding-bottom:6px; margin-bottom:12px">
                📦 Artículos Planificados (${detalle.total_items})
            </h4>
            ${tablaItems}
        `;
    } catch (e) {
        document.getElementById('plan-detalle-body').innerHTML =
            '<p class="error-message">Error al cargar el detalle</p>';
    }
}

function showImportModal(planId) {
    if (planId) currentPlanId = planId;
    document.getElementById('plan-import-modal').style.display = 'flex';
    document.getElementById('plan-upload-result').innerHTML = '';
}

function closeImportModal() {
    document.getElementById('plan-import-modal').style.display = 'none';
}

function showCreateModal() {
    document.getElementById('planificacion-form').reset();
    document.getElementById('planificacion-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('planificacion-modal').style.display = 'none';
}

function showItemsModal() {
    updateArticulosSelect();
    document.getElementById('items-form').reset();
    document.getElementById('items-modal').style.display = 'flex';
}

function closeItemsModal() {
    document.getElementById('items-modal').style.display = 'none';
}

async function savePlanificacion() {
    const data = {
        nombre: document.getElementById('plan-nombre').value,
        descripcion: document.getElementById('plan-descripcion').value,
        fecha_inicio: document.getElementById('plan-fecha-inicio').value,
        fecha_fin: document.getElementById('plan-fecha-fin').value,
    };
    try {
        await API.post('/planificacion', data);
        closeModal();
        await loadPlanificaciones();
        showSuccess('Planificación creada exitosamente');
    } catch (e) {
        showError('Error al guardar planificación');
    }
}

async function addItem() {
    if (!currentPlanId) { showError('No hay planificación seleccionada'); return; }
    const data = {
        articulo_id: document.getElementById('articulo_id').value,
        cantidad_estimada: document.getElementById('cantidad_estimada').value,
    };
    try {
        await API.post(`/planificacion/${currentPlanId}/items`, data);
        closeItemsModal();
        showSuccess('Artículo agregado');
        await verDetalle(currentPlanId); // recargar detalle
    } catch (e) {
        showError('Error al agregar artículo');
    }
}

function setupPlanUploadDnD() {
    const area = document.getElementById('plan-upload-area');
    const input = document.getElementById('plan-file-input');
    if (!area || !input) return;

    ['dragenter','dragover','dragleave','drop'].forEach(ev =>
        area.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); }));
    ['dragenter','dragover'].forEach(ev => area.addEventListener(ev, () => {
        area.style.borderColor = 'var(--primary-color)';
    }));
    ['dragleave','drop'].forEach(ev => area.addEventListener(ev, () => {
        area.style.borderColor = '#ddd';
    }));
    area.addEventListener('drop', e => {
        if (e.dataTransfer.files.length) handlePlanFile(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', e => {
        if (e.target.files.length) handlePlanFile(e.target.files[0]);
    });
}

async function handlePlanFile(file) {
    const resultDiv = document.getElementById('plan-upload-result');
    if (!currentPlanId) {
        resultDiv.innerHTML = '<div class="error-message">❌ Primero abrí el detalle de una planificación</div>';
        return;
    }
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        resultDiv.innerHTML = '<div class="error-message">❌ Solo se aceptan archivos Excel .xlsx o .xls</div>';
        return;
    }
    resultDiv.innerHTML = '<p>📤 Importando...</p>';

    const fd = new FormData();
    fd.append('file', file);

    try {
        const res = await fetch(`http://localhost:3000/api/planificacion/${currentPlanId}/items/bulk`, {
            method: 'POST', credentials: 'include', body: fd
        });
        const data = await res.json();
        if (res.ok) {
            resultDiv.innerHTML = `<div class="success-message">
                ✅ Importación exitosa. Insertados: ${data.insertados}
                ${data.errores?.length ? `<br><small style="color:orange">${data.errores.join(' | ')}</small>` : ''}
            </div>`;
            setTimeout(() => verDetalle(currentPlanId), 1000);
        } else {
            resultDiv.innerHTML = `<div class="error-message">❌ ${data.error || 'Error al procesar'}</div>`;
        }
    } catch (e) {
        resultDiv.innerHTML = `<div class="error-message">❌ Error de conexión: ${e.message}</div>`;
    }
}

function getEstado(plan) {
    const hoy = new Date();
    const inicio = new Date(plan.fecha_inicio);
    const fin = new Date(plan.fecha_fin);
    if (hoy < inicio) return { text: 'Pendiente', class: 'warning' };
    if (hoy >= inicio && hoy <= fin) return { text: 'En Curso', class: 'success' };
    return { text: 'Finalizada', class: 'secondary' };
}

function formatDate(d) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('es-AR');
}

function showError(msg) { alert(msg); }
function showSuccess(msg) { alert(msg); }

window.planificacionModule = {
    showCreateModal,
    closeModal,
    savePlanificacion,
    showItemsModal,
    closeItemsModal,
    addItem,
    verDetalle,
    showImportModal,
    closeImportModal,
};
