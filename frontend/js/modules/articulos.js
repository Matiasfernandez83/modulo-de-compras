// Módulo de artículos con doble click, historial de compras y template Excel
import { ArticulosAPI, API } from '../api.js';

let articulos = [];
let categorias = [];
let editingId = null;

export async function initArticulos() {
    renderArticulosView();
    await loadCategorias();
    await loadArticulos();
}

function renderArticulosView() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Artículos</h2>
                <div style="display: flex; gap: 8px; flex-wrap:wrap;">
                    <a href="${window.location.origin}/api/articulos/template"
                       class="btn btn-secondary" download title="Descargar planilla Excel para carga masiva">
                        📥 Descargar Template Excel
                    </a>
                    <button class="btn btn-secondary" onclick="window.articulosModule.showUploadModal()">
                        📤 Importar Excel
                    </button>
                    <button class="btn btn-secondary" onclick="window.articulosModule.exportar()">
                        📊 Exportar Excel
                    </button>
                    <button class="btn btn-primary" onclick="window.articulosModule.showCreateModal()">
                        + Nuevo Artículo
                    </button>
                </div>
            </div>
            <p style="padding: 8px 16px; margin:0; color:#666; font-size:0.85rem">
                💡 <strong>Doble click</strong> en una fila para ver historial de compras y precios del artículo
            </p>
            <div class="card-body">
                <div id="articulos-table-container">
                    <div class="flex-center" style="padding: 40px;">
                        <div class="spinner"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal detalle/historial artículo (doble click) -->
        <div id="articulo-detalle-modal" class="modal-overlay" style="display: none;">
            <div class="modal modal-lg">
                <div class="modal-header">
                    <h3 class="modal-title" id="articulo-detalle-titulo">Detalle del Artículo</h3>
                    <button class="modal-close" onclick="document.getElementById('articulo-detalle-modal').style.display='none'">&times;</button>
                </div>
                <div class="modal-body" id="articulo-detalle-body">
                    <div class="flex-center"><div class="spinner"></div></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="document.getElementById('articulo-detalle-modal').style.display='none'">Cerrar</button>
                </div>
            </div>
        </div>

        <!-- Modal importar Excel -->
        <div id="upload-modal" class="modal-overlay" style="display: none;">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Importar Artículos desde Excel</h3>
                    <button class="modal-close" onclick="window.articulosModule.closeUploadModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="upload-area" id="upload-area">
                        <div class="upload-icon">📁</div>
                        <p><strong>Arrastrá tu archivo Excel aquí</strong></p>
                        <p>o hacé click para seleccionar</p>
                        <input type="file" id="file-input" accept=".xlsx,.xls" style="display: none;">
                        <button class="btn btn-secondary" onclick="document.getElementById('file-input').click()">
                            Seleccionar Archivo
                        </button>
                    </div>
                    <div style="margin-top:12px; text-align:center">
                        <a href="${window.location.origin}/api/articulos/template" download class="btn btn-secondary btn-sm">
                            📥 Descargar Template
                        </a>
                    </div>
                    <div id="upload-result" style="margin-top: 20px;"></div>
                </div>
            </div>
        </div>

        <!-- Modal crear/editar artículo -->
        <div id="articulo-modal" class="modal-overlay" style="display: none;">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title" id="articulo-modal-titulo">Nuevo Artículo</h3>
                    <button class="modal-close" onclick="window.articulosModule.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="articulo-form">
                        <div class="form-group">
                            <label for="art-codigo">Código Interno *</label>
                            <input type="text" id="art-codigo" name="codigo_interno" required>
                        </div>
                        <div class="form-group">
                            <label for="art-nombre">Nombre *</label>
                            <input type="text" id="art-nombre" name="nombre" required>
                        </div>
                        <div class="form-group">
                            <label for="art-descripcion">Descripción</label>
                            <input type="text" id="art-descripcion" name="descripcion">
                        </div>
                        <div class="form-group">
                            <label for="art-categoria">Categoría</label>
                            <select id="art-categoria" name="categoria_id">
                                <option value="">Seleccione...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="art-unidad">Unidad de Medida</label>
                            <input type="text" id="art-unidad" name="unidad_medida" placeholder="KG, UN, LT, etc.">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="window.articulosModule.closeModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="window.articulosModule.saveArticulo()">Guardar</button>
                </div>
            </div>
        </div>
    `;

    setupDragAndDrop();
}

async function loadCategorias() {
    try {
        categorias = await ArticulosAPI.getCategorias();
    } catch { categorias = []; }
}

function poblarSelectCategorias() {
    const sel = document.getElementById('art-categoria');
    if (!sel) return;
    sel.innerHTML = '<option value="">Seleccione...</option>';
    (categorias || []).forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.nombre;
        sel.appendChild(opt);
    });
}

async function loadArticulos() {
    try {
        articulos = await ArticulosAPI.getAll();
        renderArticulosTable();
    } catch (error) {
        console.error('Error loading articulos:', error);
        document.getElementById('articulos-table-container').innerHTML =
            '<p class="error-message">Error al cargar artículos</p>';
    }
}

function renderArticulosTable() {
    const container = document.getElementById('articulos-table-container');

    if (articulos.length === 0) {
        container.innerHTML = '<p class="text-center">No hay artículos registrados.</p>';
        return;
    }

    const html = `
        <table class="table" id="articulos-tabla">
            <thead>
                <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Categoría</th>
                    <th>Unidad</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${articulos.map(a => `
                    <tr data-id="${a.id}" style="cursor:pointer" title="Doble click para ver historial">
                        <td>${a.codigo_interno}</td>
                        <td>${a.nombre || a.descripcion}</td>
                        <td>${a.categoria || a.categoria_nombre || '-'}</td>
                        <td>${a.unidad_medida || '-'}</td>
                        <td onclick="event.stopPropagation()">
                            <button class="btn btn-sm btn-secondary"
                                    onclick="window.articulosModule.editArticulo(${a.id})">✏️ Editar</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;

    // Doble click en fila → detalle + historial
    document.querySelectorAll('#articulos-tabla tbody tr').forEach(tr => {
        tr.addEventListener('dblclick', () => {
            const id = parseInt(tr.dataset.id);
            verDetalleArticulo(id);
        });
    });
}

async function verDetalleArticulo(id) {
    const art = articulos.find(a => a.id === id);
    if (!art) return;

    document.getElementById('articulo-detalle-titulo').textContent =
        `${art.codigo_interno} — ${art.nombre || art.descripcion}`;
    document.getElementById('articulo-detalle-body').innerHTML =
        '<div class="flex-center" style="padding:30px"><div class="spinner"></div></div>';
    document.getElementById('articulo-detalle-modal').style.display = 'flex';

    try {
        const [compras, precios] = await Promise.all([
            API.get(`/articulos/${id}/historial-compras`),
            API.get(`/articulos/${id}/historial-precios`)
        ]);

        const datosBasicos = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px">
                <div><p><strong>Código:</strong> ${art.codigo_interno}</p>
                     <p><strong>Nombre:</strong> ${art.nombre || art.descripcion}</p>
                     <p><strong>Categoría:</strong> ${art.categoria || art.categoria_nombre || '-'}</p></div>
                <div><p><strong>Unidad:</strong> ${art.unidad_medida || '-'}</p>
                     <p><strong>Alta:</strong> ${art.fecha_creacion ? new Date(art.fecha_creacion).toLocaleDateString('es-AR') : '-'}</p></div>
            </div>`;

        const tablaCompras = compras.length === 0
            ? '<p class="text-muted">Sin órdenes de compra registradas para este artículo</p>'
            : `<div class="table-responsive">
                <table class="table">
                    <thead><tr>
                        <th>N° OC</th><th>Fecha</th><th>Proveedor</th>
                        <th>Cantidad</th><th>Precio Unit.</th><th>Subtotal</th><th>Estado</th>
                    </tr></thead>
                    <tbody>
                        ${compras.map(c => `<tr>
                            <td><strong>${c.numero || c.comprobante_id}</strong></td>
                            <td>${c.fecha_emision ? new Date(c.fecha_emision).toLocaleDateString('es-AR') : '-'}</td>
                            <td>${c.proveedor}</td>
                            <td>${c.cantidad}</td>
                            <td>$${(c.precio_unitario || 0).toLocaleString('es-AR', {minimumFractionDigits:2})}</td>
                            <td>$${(c.subtotal || 0).toLocaleString('es-AR', {minimumFractionDigits:2})}</td>
                            <td><span class="badge badge-info">${c.estado || '-'}</span></td>
                        </tr>`).join('')}
                    </tbody>
                </table>
               </div>`;

        const tablaPrecios = precios.length === 0
            ? '<p class="text-muted">Sin historial de precios para este artículo</p>'
            : `<div class="table-responsive">
                <table class="table">
                    <thead><tr>
                        <th>Lista</th><th>Proveedor</th><th>Vigencia</th>
                        <th>Precio Bruto</th><th>Desc %</th><th>IVA %</th><th>Precio Neto</th>
                    </tr></thead>
                    <tbody>
                        ${precios.map(p => `<tr>
                            <td>${p.lista}</td>
                            <td>${p.proveedor}</td>
                            <td>${p.fecha_vigencia ? new Date(p.fecha_vigencia).toLocaleDateString('es-AR') : '-'}</td>
                            <td>$${(p.precio_bruto || 0).toLocaleString('es-AR', {minimumFractionDigits:2})}</td>
                            <td>${p.descuento_porcentaje || 0}%</td>
                            <td>${p.iva_porcentaje || 0}%</td>
                            <td><strong>$${(p.precio_neto || 0).toLocaleString('es-AR', {minimumFractionDigits:2})}</strong></td>
                        </tr>`).join('')}
                    </tbody>
                </table>
               </div>`;

        document.getElementById('articulo-detalle-body').innerHTML = `
            ${datosBasicos}
            <h4 style="border-bottom:2px solid var(--primary-color); padding-bottom:6px; margin-bottom:12px">
                📋 Historial de Órdenes de Compra (${compras.length})
            </h4>
            ${tablaCompras}
            <h4 style="border-bottom:2px solid var(--primary-color); padding-bottom:6px; margin:20px 0 12px">
                💰 Historial de Listas de Precios (${precios.length})
            </h4>
            ${tablaPrecios}
        `;
    } catch (e) {
        document.getElementById('articulo-detalle-body').innerHTML =
            '<p class="error-message">Error al cargar el historial</p>';
    }
}

function showUploadModal() {
    document.getElementById('upload-modal').style.display = 'flex';
    document.getElementById('upload-result').innerHTML = '';
}

function closeUploadModal() {
    document.getElementById('upload-modal').style.display = 'none';
}

function showCreateModal() {
    editingId = null;
    document.getElementById('articulo-modal-titulo').textContent = 'Nuevo Artículo';
    document.getElementById('articulo-form').reset();
    poblarSelectCategorias();
    document.getElementById('articulo-modal').style.display = 'flex';
}

function editArticulo(id) {
    const a = articulos.find(x => x.id === id);
    if (!a) return;

    editingId = id;
    document.getElementById('articulo-modal-titulo').textContent = 'Editar Artículo';
    poblarSelectCategorias();

    document.getElementById('art-codigo').value = a.codigo_interno || '';
    document.getElementById('art-nombre').value = a.nombre || '';
    document.getElementById('art-descripcion').value = a.descripcion || '';
    document.getElementById('art-categoria').value = a.categoria_id || '';
    document.getElementById('art-unidad').value = a.unidad_medida || '';

    document.getElementById('articulo-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('articulo-modal').style.display = 'none';
    editingId = null;
}

async function saveArticulo() {
    const data = {
        codigo_interno: document.getElementById('art-codigo').value,
        nombre: document.getElementById('art-nombre').value,
        descripcion: document.getElementById('art-descripcion').value,
        categoria_id: document.getElementById('art-categoria').value || null,
        unidad_medida: document.getElementById('art-unidad').value,
    };

    try {
        if (editingId) {
            await ArticulosAPI.update(editingId, data);
            alert('Artículo actualizado exitosamente');
        } else {
            await ArticulosAPI.create(data);
            alert('Artículo creado exitosamente');
        }
        closeModal();
        await loadArticulos();
    } catch (error) {
        alert('Error al guardar artículo: ' + error.message);
    }
}

async function exportar() {
    const a = document.createElement('a');
    a.href = `${window.location.origin}/api/export/articulos`;
    a.download = 'articulos.xlsx';
    a.click();
}

function setupDragAndDrop() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    if (!uploadArea || !fileInput) return;

    ['dragenter','dragover','dragleave','drop'].forEach(e =>
        uploadArea.addEventListener(e, ev => { ev.preventDefault(); ev.stopPropagation(); }));

    ['dragenter','dragover'].forEach(e => uploadArea.addEventListener(e, () => {
        uploadArea.style.borderColor = 'var(--primary-color)';
        uploadArea.style.background = 'rgba(198,34,0,0.05)';
    }));

    ['dragleave','drop'].forEach(e => uploadArea.addEventListener(e, () => {
        uploadArea.style.borderColor = '#ddd';
        uploadArea.style.background = '#f9f9f9';
    }));

    uploadArea.addEventListener('drop', e => {
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', e => {
        if (e.target.files.length) handleFile(e.target.files[0]);
    });
}

async function handleFile(file) {
    const resultDiv = document.getElementById('upload-result');
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        resultDiv.innerHTML = '<div class="error-message">❌ Formato inválido. Usá .xlsx o .xls</div>';
        return;
    }
    resultDiv.innerHTML = '<p>📤 Subiendo archivo...</p>';

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${window.location.origin}/api/upload/articulos`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        const data = await response.json();
        if (response.ok) {
            resultDiv.innerHTML = `<div class="success-message">
                ✅ Importación exitosa. Insertados: ${data.insertados || 0} de ${data.total || 0}
                ${data.errores?.length ? `<br><small>${data.errores.join(', ')}</small>` : ''}
            </div>`;
            setTimeout(() => loadArticulos(), 1000);
        } else {
            resultDiv.innerHTML = `<div class="error-message">❌ ${data.error || 'Error al procesar'}</div>`;
        }
    } catch (e) {
        resultDiv.innerHTML = `<div class="error-message">❌ Error de conexión: ${e.message}</div>`;
    }
}

window.articulosModule = {
    showUploadModal,
    closeUploadModal,
    showCreateModal,
    editArticulo,
    closeModal,
    saveArticulo,
    exportar,
};


